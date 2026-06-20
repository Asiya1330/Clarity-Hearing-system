/**
 * OViz Control Room — server-side constants for the hidden owner/staff console.
 *
 * These are NOT secrets (the owner email and route paths are not security
 * controls — real security comes from Supabase auth, app_metadata claims,
 * mandatory TOTP MFA, and the proxy + server-side guards). They live in one
 * place so the proxy, auth helpers, pages, and scripts agree on exact values.
 *
 * IMPORTANT: do not render OVIZ_OWNER_EMAIL as public page copy. The login page
 * must never reveal who the owner is.
 */

/** The single hardcoded SaaS-owner identity. Highest privilege; cannot be
 *  revoked, disabled, or demoted by any console action. */
export const OVIZ_OWNER_EMAIL = "sl@evear.ca";

/** Hidden access (email + password) landing page. */
export const OWNER_CONSOLE_LOGIN_PATH = "/auth/oviz-control-room";

/** Hidden TOTP MFA enrol / challenge page. */
export const OWNER_CONSOLE_MFA_PATH = "/auth/oviz-control-room/mfa";

/** Root of the authenticated owner console (route group (owner-console)). */
export const OWNER_CONSOLE_ROOT_PATH = "/ops/oviz-control-room";

/** Prefix for owner-console API route handlers. */
export const OWNER_CONSOLE_API_PREFIX = "/api/owner-console";

/** Console roles, in descending privilege. Stored in
 *  auth.users.app_metadata.oviz_console_role. */
export const OWNER_CONSOLE_ROLES = ["super_admin", "sub_admin"] as const;

export type OwnerConsoleRole = (typeof OWNER_CONSOLE_ROLES)[number];

/** app_metadata keys the console reads/writes on auth.users. */
export const APP_METADATA_CONSOLE_ENABLED = "oviz_console_enabled" as const;
export const APP_METADATA_CONSOLE_ROLE = "oviz_console_role" as const;
