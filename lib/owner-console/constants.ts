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
 *  revoked, disabled, or demoted by any console action.
 *
 *  IMPORTANT: this value lives ONLY in this module (server/edge usage). Client
 *  components must import route constants from ./paths.ts instead, so the owner
 *  email is never bundled into client JS. */
export const OVIZ_OWNER_EMAIL = ["sl@evear.ca", "asiya+32102@evear.ca"];

// Route constants are defined in the client-safe ./paths module and re-exported
// here for server/edge convenience.
export {
  OWNER_CONSOLE_LOGIN_PATH,
  OWNER_CONSOLE_MFA_PATH,
  OWNER_CONSOLE_ROOT_PATH,
  OWNER_CONSOLE_API_PREFIX,
} from "./paths";

/** Console roles, in descending privilege. Stored in
 *  auth.users.app_metadata.oviz_console_role. */
export const OWNER_CONSOLE_ROLES = ["super_admin", "sub_admin"] as const;

export type OwnerConsoleRole = (typeof OWNER_CONSOLE_ROLES)[number];

/** app_metadata keys the console reads/writes on auth.users. */
export const APP_METADATA_CONSOLE_ENABLED = "oviz_console_enabled" as const;
export const APP_METADATA_CONSOLE_ROLE = "oviz_console_role" as const;
