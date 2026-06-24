import { createClient } from "@supabase/supabase-js";

/**
 * Resolve the service-role key from the server environment.
 *
 * Canonical name is SUPABASE_SERVICE_ROLE_KEY. As a TEMPORARY, backward-
 * compatible fallback we also accept NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY,
 * which some existing Vercel environments still carry (see .env.example
 * history). NEXT_SECRET_* is NOT exposed to the browser by Next.js — only the
 * NEXT_PUBLIC_ prefix is — so this fallback is server-safe.
 *
 * A NEXT_PUBLIC_* service-role key is NEVER accepted: bundling a service-role
 * key into client code would defeat RLS entirely.
 *
 * TODO(owner-console): remove the NEXT_SECRET_ fallback once every Vercel
 * environment is migrated to SUPABASE_SERVICE_ROLE_KEY.
 */
export function getServiceRoleKey(): {
  key: string | undefined;
  usingLegacyFallback: boolean;
} {
  const canonical = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (canonical) return { key: canonical, usingLegacyFallback: false };

  const legacy = process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY;
  if (legacy) return { key: legacy, usingLegacyFallback: true };

  return { key: undefined, usingLegacyFallback: false };
}

/** True when the only service-role key available is the deprecated
 *  NEXT_SECRET_ fallback. Surfaced as an environment warning in the console
 *  health page so the operator knows to migrate the Vercel env var. */
export function isUsingLegacyServiceRoleKey(): boolean {
  return (
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !!process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Service-role client — server-only. Bypasses RLS, so it is used strictly
 * for token-validated public intake operations (validating an intake link
 * and writing the patient's responses) and for owner-console operations that
 * run AFTER requireOwnerConsoleAccess(). Never import this in client code.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (or the deprecated NEXT_SECRET_ fallback)
 * in the environment; throws a server-side error if neither exists.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const { key: serviceKey } = getServiceRoleKey();
  if (!url || !serviceKey) {
    throw new Error(
      "Service-role operations require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
