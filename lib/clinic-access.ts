/**
 * Clinic account-status access control.
 *
 * A clinic can be `suspended` from the owner console. When it is, members must
 * be blocked from the authenticated app and from clinic-mutating APIs, and
 * patient intake links for that clinic must stop working — without breaking
 * onboarding for users who do not yet have a profile/clinic.
 *
 * The pure mapping (clinicAccessFromRows / isSuspended) is unit-tested; the
 * async fetcher is a thin wrapper used by the (app) layout and API routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type ClinicAccessState =
  | { state: "no_clinic" }
  | { state: "active"; clinicId: string }
  | { state: "suspended"; clinicId: string };

export const ACCOUNT_SUSPENDED_PATH = "/account-suspended";

/** True only for the explicit 'suspended' status. Unknown/active/null are not
 *  suspended — we never block on ambiguity. */
export function isSuspended(accountStatus: string | null | undefined): boolean {
  return accountStatus === "suspended";
}

interface ProfileRow {
  clinic_id?: string | null;
}
interface ClinicRow {
  account_status?: string | null;
}

/**
 * Map a profile row + clinic row to an access state. We only return
 * `suspended` when we POSITIVELY observe account_status === 'suspended'; any
 * other shape (no profile, missing clinic_id, missing clinic row) resolves to a
 * non-blocking state so onboarding and edge cases are never trapped.
 */
export function clinicAccessFromRows(
  profile: ProfileRow | null | undefined,
  clinic: ClinicRow | null | undefined,
): ClinicAccessState {
  const clinicId = profile?.clinic_id;
  if (!clinicId) return { state: "no_clinic" };
  if (clinic && isSuspended(clinic.account_status)) {
    return { state: "suspended", clinicId };
  }
  return { state: "active", clinicId };
}

/**
 * Fetch the calling user's clinic access state using their RLS-scoped session
 * client. Reads only the user's own profile + clinic (allowed by existing RLS).
 */
export async function getClinicAccessForUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<ClinicAccessState> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.clinic_id) return { state: "no_clinic" };

  const { data: clinic } = await supabase
    .from("clinics")
    .select("account_status")
    .eq("id", profile.clinic_id)
    .maybeSingle();

  return clinicAccessFromRows(profile, clinic);
}

/**
 * Server-side guard for clinic-mutating API routes. Given a session client and
 * a known clinicId, returns whether the clinic is suspended. Uses the caller's
 * RLS-scoped client (the clinic is the caller's own, so SELECT is permitted).
 */
export async function isClinicSuspended(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  clinicId: string,
): Promise<boolean> {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("account_status")
    .eq("id", clinicId)
    .maybeSingle();
  return isSuspended(clinic?.account_status);
}
