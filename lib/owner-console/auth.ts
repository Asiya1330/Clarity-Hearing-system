/**
 * Server-side authorization for the OViz Control Room.
 *
 * SERVER-ONLY. Imports the Supabase server client, the service-role admin
 * client, and next/navigation — never import this from a "use client" file.
 * Pure claim/role predicates that the Edge proxy also needs live in ./claims.ts
 * (re-exported below for one-import convenience).
 *
 * Access is decided from the verified Supabase identity only:
 *   1. a session exists,
 *   2. the user is the hardcoded owner OR has app_metadata.oviz_console_enabled
 *      with a valid console role,
 *   3. the session is AAL2 (TOTP MFA satisfied) for console pages/APIs,
 *   4. if the user is the owner but app_metadata is missing/stale, it is
 *      repaired server-side with the service role (best-effort, non-blocking:
 *      the owner is authorized by email regardless, so a repair failure can
 *      never lock the owner out).
 */

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { captureOwnerConsoleException } from "./observability";
import {
  OWNER_CONSOLE_LOGIN_PATH,
  OWNER_CONSOLE_MFA_PATH,
  type OwnerConsoleRole,
} from "./constants";
import {
  aalFromClaims,
  getConsoleRoleFromUser,
  isAal2,
  isConsoleEnabled,
  isHardcodedOwner,
  isSuperAdmin as isSuperAdminMeta,
  normalizeEmail,
  type ConsoleIdentity,
} from "./claims";

// Re-export the pure helpers so callers can `import { ... } from "@/lib/owner-console/auth"`.
export {
  normalizeEmail,
  getConsoleRoleFromUser,
  isHardcodedOwner,
  isConsoleEnabled,
  isSubAdmin,
} from "./claims";
export { isSuperAdminMeta as isSuperAdmin };

export interface OwnerConsoleUserContext {
  userId: string;
  email: string;
  role: OwnerConsoleRole;
  isOwnerEmail: boolean;
  aal: string;
}

export type AccessFailureReason = "unauthenticated" | "forbidden" | "mfa_required";

export type AccessResult =
  | { ok: true; ctx: OwnerConsoleUserContext }
  | { ok: false; reason: AccessFailureReason };

interface ResolveOptions {
  /** Require AAL2 (TOTP). Default true. The MFA enrol page passes false. */
  requireMfa?: boolean;
}

function claimsToIdentity(claims: Record<string, unknown>): ConsoleIdentity {
  return {
    email: typeof claims["email"] === "string" ? (claims["email"] as string) : null,
    app_metadata:
      (claims["app_metadata"] as Record<string, unknown> | undefined) ?? null,
  };
}

/**
 * Owner self-repair. Idempotently writes the console app_metadata for the
 * hardcoded owner using the service role. Does NOT refresh the session (a
 * server-component refresh can drop rotated refresh-token cookies and log the
 * user out); the corrected metadata takes effect on the next natural token
 * refresh or relogin. The owner is authorized by email in the meantime.
 */
async function tryRepairOwnerMetadata(
  userId: string,
  identity: ConsoleIdentity,
): Promise<void> {
  try {
    const existing =
      (identity.app_metadata as Record<string, unknown> | null) ?? {};
    if (
      existing["oviz_console_enabled"] === true &&
      existing["oviz_console_role"] === "super_admin"
    ) {
      return; // already coherent
    }
    const admin = createAdminClient();
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...existing,
        oviz_console_enabled: true,
        oviz_console_role: "super_admin",
      },
    });
  } catch (error) {
    captureOwnerConsoleException(error, "owner_metadata_repair", { userId });
  }
}

/**
 * Core resolver. Returns a discriminated result and NEVER redirects/throws, so
 * it is reusable by both page guards (which redirect) and API guards (which
 * return JSON).
 */
export async function resolveOwnerConsoleAccess(
  options?: ResolveOptions,
): Promise<AccessResult> {
  const requireMfa = options?.requireMfa ?? true;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = (data?.claims as Record<string, unknown> | undefined) ?? null;

  if (!claims || typeof claims["sub"] !== "string") {
    return { ok: false, reason: "unauthenticated" };
  }
  const userId = claims["sub"] as string;
  const identity = claimsToIdentity(claims);
  const ownerEmail = isHardcodedOwner(identity);

  if (ownerEmail) {
    // Non-blocking; keeps stored metadata coherent for future sessions.
    await tryRepairOwnerMetadata(userId, identity);
  }

  if (!isConsoleEnabled(identity)) {
    return { ok: false, reason: "forbidden" };
  }
  const role = getConsoleRoleFromUser(identity);
  if (!role) {
    return { ok: false, reason: "forbidden" };
  }

  if (requireMfa && !isAal2(claims)) {
    return { ok: false, reason: "mfa_required" };
  }

  return {
    ok: true,
    ctx: {
      userId,
      email: normalizeEmail(identity.email),
      role,
      isOwnerEmail: ownerEmail,
      aal: aalFromClaims(claims),
    },
  };
}

// ---------------------------------------------------------------------------
// Page guards (server components / layouts) — redirect on failure.
// ---------------------------------------------------------------------------

function redirectForFailure(reason: AccessFailureReason): never {
  // redirect() returns `never` (it throws), so each branch terminates.
  if (reason === "unauthenticated") redirect(OWNER_CONSOLE_LOGIN_PATH);
  if (reason === "mfa_required") redirect(OWNER_CONSOLE_MFA_PATH);
  // Generic — never reveal that the console exists or who may access it.
  redirect("/auth/error");
}

/** Authenticated + console-authorized, WITHOUT the AAL2 gate. Used by the MFA
 *  enrol/verify page (the user is there precisely to obtain AAL2). */
export async function requireOwnerConsoleUser(
  options?: ResolveOptions,
): Promise<OwnerConsoleUserContext> {
  const res = await resolveOwnerConsoleAccess({ requireMfa: false, ...options });
  if (!res.ok) redirectForFailure(res.reason);
  return res.ctx;
}

/** Full console access: authenticated + console-authorized + AAL2. The
 *  canonical guard for every console page and layout. */
export async function requireOwnerConsoleAccess(
  options?: ResolveOptions,
): Promise<OwnerConsoleUserContext> {
  const res = await resolveOwnerConsoleAccess(options);
  if (!res.ok) redirectForFailure(res.reason);
  return res.ctx;
}

/** Full console access AND super_admin role. For billing/staff/owner-sensitive
 *  pages. Sub-admins are redirected away generically. */
export async function requireSuperAdmin(
  options?: ResolveOptions,
): Promise<OwnerConsoleUserContext> {
  const ctx = await requireOwnerConsoleAccess(options);
  if (ctx.role !== "super_admin") redirect("/auth/error");
  return ctx;
}

/** Ensure the session is AAL2 (assumes console eligibility is wanted too). */
export async function requireAal2Mfa(
  options?: ResolveOptions,
): Promise<OwnerConsoleUserContext> {
  return requireOwnerConsoleAccess({ requireMfa: true, ...options });
}

// ---------------------------------------------------------------------------
// API guards (route handlers) — return a NextResponse on failure (no redirect).
// ---------------------------------------------------------------------------

export type ApiGuardResult =
  | { ok: true; ctx: OwnerConsoleUserContext }
  | { ok: false; response: NextResponse };

function apiFailure(reason: AccessFailureReason): NextResponse {
  switch (reason) {
    case "unauthenticated":
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    case "mfa_required":
      return NextResponse.json({ error: "MFA required." }, { status: 403 });
    case "forbidden":
    default:
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
}

/**
 * Authorize an owner-console API request. Returns the context on success, or a
 * ready-to-return generic JSON error response on failure. Pass
 * `{ superAdmin: true }` for billing/staff/owner-sensitive endpoints.
 */
export async function authorizeOwnerConsoleApi(options?: {
  superAdmin?: boolean;
}): Promise<ApiGuardResult> {
  const res = await resolveOwnerConsoleAccess();
  if (!res.ok) return { ok: false, response: apiFailure(res.reason) };
  if (options?.superAdmin && res.ctx.role !== "super_admin") {
    return { ok: false, response: apiFailure("forbidden") };
  }
  return { ok: true, ctx: res.ctx };
}

// ---------------------------------------------------------------------------
// Same-origin verification for destructive POST handlers.
// ---------------------------------------------------------------------------

/**
 * Best-effort same-origin / CSRF check. Browsers always send Origin on a
 * cross-origin-capable fetch POST; we require it to match the request Host (or
 * the configured site URL). When Origin is absent we accept only an explicit
 * same-origin Sec-Fetch-Site signal.
 */
export function verifySameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin) {
    return request.headers.get("sec-fetch-site") === "same-origin";
  }
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return true;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && originHost === new URL(siteUrl).host) return true;
    return false;
  } catch {
    return false;
  }
}

/** 403 used when same-origin verification fails on a destructive route. */
export function sameOriginFailure(): NextResponse {
  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}
