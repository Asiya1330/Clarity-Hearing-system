import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only. Bypasses RLS, so it is used strictly
 * for token-validated public intake operations (validating an intake link
 * and writing the patient's responses). Never import this in client code.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Patient intake requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
