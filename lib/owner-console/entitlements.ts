/**
 * Per-clinic feature entitlements. SERVER-ONLY.
 *
 * owner_console_entitlements has RLS enabled with NO client policies, so all
 * access here uses the service-role admin client. Reads in non-console flows
 * (e.g. the kiosk gate in the intake route) are targeted, single-row service
 * reads — never broad.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { writeAdminAuditLog, type AdminAuditActor } from "./audit";
import { captureOwnerConsoleException } from "./observability";

export interface Entitlements {
  clinic_id: string;
  enable_kiosk_mode: boolean;
  enable_presentation_mode: boolean;
  enable_audiogram_ai_beta: boolean;
  notes: string | null;
  updated_at: string | null;
}

/** Defaults match the migration column defaults (used when no row exists). */
export const DEFAULT_ENTITLEMENTS: Omit<Entitlements, "clinic_id" | "updated_at"> = {
  enable_kiosk_mode: true,
  enable_presentation_mode: false,
  enable_audiogram_ai_beta: false,
  notes: null,
};

export async function getEntitlements(clinicId: string): Promise<Entitlements> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("owner_console_entitlements")
    .select(
      "clinic_id, enable_kiosk_mode, enable_presentation_mode, enable_audiogram_ai_beta, notes, updated_at",
    )
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!data) {
    return { clinic_id: clinicId, updated_at: null, ...DEFAULT_ENTITLEMENTS };
  }
  return data as Entitlements;
}

/**
 * Targeted kiosk gate for the intake route. Returns true unless a row exists
 * and explicitly disables kiosk mode (fail-open to the column default of true
 * so clinics without an entitlements row keep working).
 */
export async function isKioskEnabled(clinicId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("owner_console_entitlements")
      .select("enable_kiosk_mode")
      .eq("clinic_id", clinicId)
      .maybeSingle();
    if (!data) return DEFAULT_ENTITLEMENTS.enable_kiosk_mode;
    return data.enable_kiosk_mode !== false;
  } catch (error) {
    captureOwnerConsoleException(error, "entitlement.kiosk_check", { clinicId });
    // Fail open to the documented default rather than blocking clinic intake.
    return DEFAULT_ENTITLEMENTS.enable_kiosk_mode;
  }
}

export interface SetEntitlementsInput {
  clinicId: string;
  values: {
    enable_kiosk_mode: boolean;
    enable_presentation_mode: boolean;
    enable_audiogram_ai_beta: boolean;
    notes?: string | null;
  };
  actor: AdminAuditActor;
  request?: Request;
}

export async function setEntitlements(
  input: SetEntitlementsInput,
): Promise<{ ok: boolean; error?: string }> {
  const { clinicId, values, actor, request } = input;
  const admin = createAdminClient();

  const { error } = await admin.from("owner_console_entitlements").upsert(
    {
      clinic_id: clinicId,
      enable_kiosk_mode: values.enable_kiosk_mode,
      enable_presentation_mode: values.enable_presentation_mode,
      enable_audiogram_ai_beta: values.enable_audiogram_ai_beta,
      notes: values.notes ?? null,
      updated_by: actor.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clinic_id" },
  );

  if (error) {
    captureOwnerConsoleException(
      new Error("owner_console_entitlements.upsert failed"),
      "entitlement.change",
      { clinicId, code: error.code },
    );
    return { ok: false, error: "Could not save entitlements. Try again." };
  }

  await writeAdminAuditLog({
    actor,
    action: "entitlement.change",
    targetType: "clinic",
    targetId: clinicId,
    targetClinicId: clinicId,
    metadata: {
      enable_kiosk_mode: values.enable_kiosk_mode,
      enable_presentation_mode: values.enable_presentation_mode,
      enable_audiogram_ai_beta: values.enable_audiogram_ai_beta,
    },
    request,
  });

  return { ok: true };
}
