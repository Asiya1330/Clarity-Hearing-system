import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_CLINIC_ROLE,
} from "@/lib/clinic-roles";

export type EnsureOwnerProfileResult =
  | { ok: true; created: boolean; profileId: string }
  | { ok: false; error: string };

/**
 * Ensures a profiles row exists for a newly registered auth user.
 * New users start as employee with no clinic until onboarding (owner) or invite.
 */
export async function ensureOwnerProfile(
  admin: SupabaseClient,
  userId: string,
  fullName?: string | null,
): Promise<EnsureOwnerProfileResult> {
  const { data: existing, error: selectError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  if (existing) {
    return { ok: true, created: false, profileId: existing.id };
  }

  const { error: insertError } = await admin.from("profiles").insert({
    id: userId,
    clinic_id: null,
    full_name: fullName?.trim() || null,
    role: DEFAULT_CLINIC_ROLE,
  });

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, created: true, profileId: userId };
}
