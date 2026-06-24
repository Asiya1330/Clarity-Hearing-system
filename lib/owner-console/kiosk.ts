/**
 * Kiosk-session control for the owner console. SERVER-ONLY.
 *
 * The source of truth for a kiosk "session" is an intake_links row with
 * mode='kiosk'. Force-killing a session sets revoked_* on the link (token
 * validation then treats it exactly like an expired/used link), records a
 * kiosk_session_events row, and writes an admin audit row.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";

export interface ActiveKioskSession {
  id: string;
  clinicId: string;
  clinicName: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string | null;
}

/** Active kiosk links: mode=kiosk, unused, unexpired, not revoked. */
export async function listActiveKioskSessions(): Promise<ActiveKioskSession[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("intake_links")
    .select("id, clinic_id, created_at, expires_at, created_by, clinics(name)")
    .eq("mode", "kiosk")
    .is("used_at", null)
    .is("revoked_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    captureOwnerConsoleException(error, "kiosk.list");
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      clinic_id: string;
      created_at: string;
      expires_at: string;
      created_by: string | null;
      clinics: { name: string } | { name: string }[] | null;
    };
    const clinic = Array.isArray(r.clinics) ? r.clinics[0] : r.clinics;
    return {
      id: r.id,
      clinicId: r.clinic_id,
      clinicName: clinic?.name ?? "—",
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      createdBy: r.created_by,
    };
  });
}

export async function revokeKioskSession(input: {
  linkId: string;
  actor: AdminAuditActor;
  reason?: string;
  request?: Request;
}): Promise<{ ok: boolean; error?: string }> {
  const { linkId, actor, reason, request } = input;
  const admin = createAdminClient();

  // Look up the link for clinic context + idempotency.
  const { data: link } = await admin
    .from("intake_links")
    .select("id, clinic_id, revoked_at")
    .eq("id", linkId)
    .maybeSingle();
  if (!link) return { ok: false, error: "Session not found." };

  const nowIso = new Date().toISOString();
  const { error: updateError } = await admin
    .from("intake_links")
    .update({
      revoked_at: nowIso,
      revoked_by: actor.userId,
      revoked_reason: reason ?? "Force-killed from owner console.",
    })
    .eq("id", linkId);

  if (updateError) {
    captureOwnerConsoleException(updateError, "kiosk.session_revoke", { linkId });
    return { ok: false, error: "Could not revoke the session. Try again." };
  }

  // Lifecycle event (best-effort).
  const { error: eventError } = await admin.from("kiosk_session_events").insert({
    clinic_id: link.clinic_id,
    intake_link_id: linkId,
    action: "force_kill",
    actor_user_id: actor.userId,
    metadata: { reason: reason ?? null },
  });
  if (eventError) {
    captureOwnerConsoleException(eventError, "kiosk.session_revoke", {
      linkId,
      stage: "event",
    });
  }

  await writeAdminAuditLog({
    actor,
    action: "kiosk.session_revoke",
    targetType: "intake_link",
    targetId: linkId,
    targetClinicId: link.clinic_id,
    metadata: { alreadyRevoked: !!link.revoked_at },
    request,
  });

  return { ok: true };
}
