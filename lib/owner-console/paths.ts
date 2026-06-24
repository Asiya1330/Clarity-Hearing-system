/**
 * Client-safe route constants for the owner console.
 *
 * These are the ONLY owner-console constants that may be imported into client
 * ("use client") components. They contain no identity material — notably NOT
 * the owner email — so bundling them into client JS leaks nothing. The owner
 * email and role list live in ./constants.ts (server/edge usage only).
 */

export const OWNER_CONSOLE_LOGIN_PATH = "/auth/oviz-control-room";
export const OWNER_CONSOLE_MFA_PATH = "/auth/oviz-control-room/mfa";
export const OWNER_CONSOLE_ROOT_PATH = "/ops/oviz-control-room";
export const OWNER_CONSOLE_API_PREFIX = "/api/owner-console";
