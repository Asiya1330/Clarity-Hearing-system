/**
 * Immutable admin audit trail for the owner console. SERVER-ONLY.
 *
 * Every destructive console action writes one row into public.admin_audit_logs
 * via the service role. That table is append-only (a DB trigger blocks UPDATE
 * and DELETE for everyone, including the service role), so the trail cannot be
 * rewritten after the fact.
 *
 * PHI/PII discipline: we NEVER store raw patient names, patient emails, full IP
 * addresses, or full user-agent strings. IP and user-agent are kept only as
 * salted HMAC-SHA256 hashes (useful for correlating sessions without being
 * personally identifying). `metadata` must contain operational data only (ids,
 * codes, counts, admin-authored reasons) — callers are responsible for that.
 */

import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientIp } from "@/lib/rate-limit";
import { captureOwnerConsoleException } from "./observability";

/** Canonical action names. A union for call-site safety; the column is free
 *  text so forward-compatible actions are still accepted. */
export type AdminAuditAction =
  | "owner_console.login_bootstrap"
  | "staff.invite"
  | "staff.revoke"
  | "staff.role_change"
  | "clinic.suspend"
  | "clinic.reactivate"
  | "entitlement.change"
  | "stripe.trial_extend"
  | "stripe.coupon_apply"
  | "email.diagnostic_send"
  | "email.reset_link_send"
  | "kiosk.session_revoke"
  | "support_view.start"
  | "support_view.close";

export interface AdminAuditActor {
  userId: string;
  email: string;
  role: string;
}

export interface WriteAdminAuditLogInput {
  actor: AdminAuditActor;
  action: AdminAuditAction | (string & {});
  targetType: string;
  targetId?: string | null;
  targetClinicId?: string | null;
  metadata?: Record<string, unknown>;
  /** When provided, request IP + user-agent are hashed and stored. */
  request?: Request;
}

function auditSalt(): string {
  // A real, long random salt MUST be set in production (see .env.example:
  // OWNER_CONSOLE_AUDIT_HASH_SALT). The fallback keeps non-prod environments
  // working without leaking; it is intentionally a constant, not a secret.
  return process.env.OWNER_CONSOLE_AUDIT_HASH_SALT ?? "oviz-owner-console-unsalted";
}

/** Salted, one-way HMAC-SHA256 of a request value. Never reversible. */
export function hashRequestValue(value: string, salt: string): string {
  return createHmac("sha256", salt).update(value).digest("hex");
}

/** Extract privacy-preserving (hashed) IP + user-agent from a request. */
export function getRequestAuditContext(request?: Request): {
  request_ip_hash: string | null;
  user_agent_hash: string | null;
} {
  if (!request) return { request_ip_hash: null, user_agent_hash: null };
  const salt = auditSalt();
  const ip = clientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  return {
    request_ip_hash: ip && ip !== "unknown" ? hashRequestValue(ip, salt) : null,
    user_agent_hash: ua ? hashRequestValue(ua, salt) : null,
  };
}

/**
 * Append one audit row. Returns { ok } — never throws — so a logging failure
 * cannot break the action it documents. Failures are reported to Sentry
 * (tagged owner_console) so the gap is visible.
 */
export async function writeAdminAuditLog(
  input: WriteAdminAuditLogInput,
): Promise<{ ok: boolean; id: string | null }> {
  const { request_ip_hash, user_agent_hash } = getRequestAuditContext(
    input.request,
  );
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_audit_logs")
      .insert({
        actor_user_id: input.actor.userId,
        actor_email: input.actor.email,
        actor_console_role: input.actor.role,
        action: input.action,
        target_type: input.targetType,
        target_id: input.targetId ?? null,
        target_clinic_id: input.targetClinicId ?? null,
        metadata: input.metadata ?? {},
        request_ip_hash,
        user_agent_hash,
      })
      .select("id")
      .single();

    if (error) {
      captureOwnerConsoleException(
        new Error("admin_audit_logs.insert failed"),
        input.action,
        { code: error.code, targetType: input.targetType },
      );
      return { ok: false, id: null };
    }
    return { ok: true, id: (data?.id as string) ?? null };
  } catch (error) {
    captureOwnerConsoleException(error, input.action, {
      targetType: input.targetType,
    });
    return { ok: false, id: null };
  }
}
