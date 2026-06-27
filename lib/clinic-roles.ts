/**
 * Clinic member roles stored on public.profiles.role and clinic_invites.role.
 *
 * Product mapping:
 * - owner: the client / clinic subscription owner (your customer).
 * - employee: customer service representatives (CSRs), including OViz
 *   internal/support/developer accounts that are not clinic owners.
 * - clinic-admin: clinic manager; same Admin nav/API access as owner.
 * - clinic-staff: audiologist / front-line clinician at the clinic.
 *
 * Signup assigns employee by default; completing onboarding promotes the
 * clinic creator to owner.
 */

export const CLINIC_ROLES = [
  "owner",
  "employee",
  "clinic-admin",
  "clinic-staff",
] as const;

export type ClinicRole = (typeof CLINIC_ROLES)[number];

/** Assigned on signup / ensure-profile before a clinic is linked. */
export const DEFAULT_CLINIC_ROLE: ClinicRole = "employee";

/** Assigned when a user creates their clinic via onboarding. */
export const ONBOARDING_CLINIC_OWNER_ROLE: ClinicRole = "owner";

/** Roles that can open Admin and invite users (owner == clinic-admin for access). */
export const CLINIC_ADMIN_ROLES = ["owner", "clinic-admin"] as const;

export type ClinicAdminRole = (typeof CLINIC_ADMIN_ROLES)[number];

/** Roles assignable when inviting a colleague. */
export const INVITE_CLINIC_ROLES = ["clinic-admin", "clinic-staff"] as const;

export type InviteClinicRole = (typeof INVITE_CLINIC_ROLES)[number];

/** Roles an owner may assign to other clinic members. */
export const ASSIGNABLE_CLINIC_ROLES = CLINIC_ROLES;

export const CLINIC_ROLE_LABELS: Record<ClinicRole, string> = {
  owner: "Owner",
  employee: "Customer Service",
  "clinic-admin": "Clinic Admin",
  "clinic-staff": "Clinic Staff",
};

export function isClinicRole(value: string | null | undefined): value is ClinicRole {
  return CLINIC_ROLES.includes(value as ClinicRole);
}

export function hasClinicAdminAccess(role: string | null | undefined): boolean {
  return CLINIC_ADMIN_ROLES.includes(role as ClinicAdminRole);
}

export function isClinicOwner(role: string | null | undefined): boolean {
  return role === "owner";
}

export function formatClinicRole(role: string | null | undefined): string {
  if (role && isClinicRole(role)) return CLINIC_ROLE_LABELS[role];
  return role ?? "—";
}
