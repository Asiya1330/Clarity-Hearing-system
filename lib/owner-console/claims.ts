/**
 * Pure, dependency-free claim/role helpers for the owner console.
 *
 * This module is import-safe from ANY runtime — including the Edge proxy
 * (lib/supabase/proxy.ts) — because it pulls in no Node APIs, no service-role
 * client, and no next/navigation. The server-side guards that DO touch those
 * live in ./auth.ts and re-export these for convenience.
 *
 * Authorization is derived ONLY from the verified Supabase identity:
 *   - the hardcoded owner email (sl@evear.ca), or
 *   - app_metadata.oviz_console_enabled + app_metadata.oviz_console_role.
 * It is NEVER derived from public profiles.role (that governs clinic-level
 * admin, a different surface).
 */

import {
  OVIZ_OWNER_EMAIL,
  OWNER_CONSOLE_ROLES,
  type OwnerConsoleRole,
} from "./constants";

/**
 * Structural shape shared by a Supabase `User` (from getUser) and decoded JWT
 * `claims` (from getClaims). Both carry `email` and `app_metadata`, so every
 * helper here works against either without an adapter.
 */
export interface ConsoleIdentity {
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
}

/** Lower-cased, trimmed email for safe equality checks. */
export function normalizeEmail(email: string | null | undefined): string {
  console.log("email", email)
  return (email ?? "").trim().toLowerCase();
}

function appMeta(user: ConsoleIdentity): Record<string, unknown> {
  return (user?.app_metadata as Record<string, unknown> | null) ?? {};
}

/** True only when the identity's email is exactly the hardcoded owner. */
export function isHardcodedOwner(user: ConsoleIdentity | null | undefined): boolean {
  
  if (!user) return false;
  console.log("user in hard coded", user);
  return OVIZ_OWNER_EMAIL.includes(normalizeEmail(user.email))
}

function rawConsoleRole(user: ConsoleIdentity): string | null {
  const role = appMeta(user)["oviz_console_role"];
  return typeof role === "string" ? role : null;
}

/**
 * Effective console role: the hardcoded owner is always super_admin; otherwise
 * the app_metadata role if (and only if) it is a recognised console role.
 * Returns null for users with no valid console role.
 */
export function getConsoleRoleFromUser(
  user: ConsoleIdentity | null | undefined,
): OwnerConsoleRole | null {
  if (!user) return null;
  console.log("isHardcodedOwner", user);
  console.log("isHardcodedOwner", isHardcodedOwner(user));
  if (isHardcodedOwner(user)) return "super_admin";
  const role = rawConsoleRole(user);
  return (OWNER_CONSOLE_ROLES as readonly string[]).includes(role ?? "")
    ? (role as OwnerConsoleRole)
    : null;
}

/** Console access is enabled for the owner, or for any user explicitly flagged
 *  with app_metadata.oviz_console_enabled === true AND a valid console role. */
export function isConsoleEnabled(
  user: ConsoleIdentity | null | undefined,
): boolean {
  console.log("user", user);
  if (!user) return false;
  if (isHardcodedOwner(user)) return true;
  console.log("appMeta(user)", appMeta(user));
  console.log("getConsoleRoleFromUser(user)", getConsoleRoleFromUser(user));
  return (
    appMeta(user)["oviz_console_enabled"] === true &&
    getConsoleRoleFromUser(user) !== null
  );
}

/** Super-admin: the hardcoded owner, or an explicit super_admin. */
export function isSuperAdmin(user: ConsoleIdentity | null | undefined): boolean {
  if (!user) return false;
  if (isHardcodedOwner(user)) return true;
  return (
    appMeta(user)["oviz_console_enabled"] === true &&
    rawConsoleRole(user) === "super_admin"
  );
}

/** Sub-admin: an explicit sub_admin (never the owner — the owner is super). */
export function isSubAdmin(user: ConsoleIdentity | null | undefined): boolean {
  if (!user) return false;
  if (isHardcodedOwner(user)) return false;
  return (
    appMeta(user)["oviz_console_enabled"] === true &&
    rawConsoleRole(user) === "sub_admin"
  );
}

/** Read the authenticator assurance level from a claims-like object. */
export function aalFromClaims(claims: Record<string, unknown> | null | undefined): string {
  const aal = claims?.["aal"];
  return typeof aal === "string" ? aal : "aal1";
}

export function isAal2(claims: Record<string, unknown> | null | undefined): boolean {
  return aalFromClaims(claims) === "aal2";
}
