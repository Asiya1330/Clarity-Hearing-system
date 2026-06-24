#!/usr/bin/env node
/**
 * Bootstrap the OViz Control Room owner.
 *
 * Grants the hardcoded owner (sl@evear.ca) console access by setting
 * app_metadata = { oviz_console_enabled: true, oviz_console_role: "super_admin" }.
 *
 * Run ONCE in a secure terminal, then sign in through /auth/oviz-control-room
 * and set up MFA:
 *
 *   node --env-file=.env.local scripts/bootstrap-owner-console.mjs
 *
 * Requires (server-only, never NEXT_PUBLIC_):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY            (or the deprecated
 *   NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY fallback)
 *
 * Does NOT set or print a password, and never prints secrets.
 */

import { createClient } from "@supabase/supabase-js";

// Must match OVIZ_OWNER_EMAIL in lib/owner-console/constants.ts.
const OWNER_EMAIL = "sl@evear.ca";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is not set.");
if (!serviceKey) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is not set (NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY also accepted).",
  );
}
// Note: a NEXT_PUBLIC_ service-role key is intentionally never read here — that
// would expose the key to the browser bundle.

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const APP_METADATA = {
  oviz_console_enabled: true,
  oviz_console_role: "super_admin",
};

async function findUserByEmail(email) {
  const target = email.trim().toLowerCase();
  // The console staff set is small; one page is sufficient.
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) fail(`Could not list users: ${error.message}`);
  return data.users.find((u) => (u.email ?? "").toLowerCase() === target) ?? null;
}

async function main() {
  console.log(`Bootstrapping owner console for ${OWNER_EMAIL}…`);

  let user = await findUserByEmail(OWNER_EMAIL);

  if (!user) {
    console.log("Owner not found — sending an invitation.");
    const { data, error } = await admin.auth.admin.inviteUserByEmail(OWNER_EMAIL);
    if (error || !data?.user) {
      fail(
        "Could not invite the owner. Either create the account first, or enable " +
          "Supabase email so invitations can be sent. (No changes were made.)",
      );
    }
    user = data.user;
    console.log("Invitation sent.");
  }

  const existingMeta = user.app_metadata ?? {};
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...existingMeta, ...APP_METADATA },
  });
  if (error) fail(`Could not set app_metadata: ${error.message}`);

  console.log("✓ Owner console access granted (super_admin).");
  console.log(
    "Next steps:\n" +
      "  1. Set a password — either via the Supabase Auth dashboard\n" +
      "     (Authentication → Users → set password), OR send yourself a reset\n" +
      "     email via /auth/forgot-password.\n" +
      "  2. Sign in at /auth/oviz-control-room and complete TOTP MFA setup.\n" +
      "If the owner was already signed in elsewhere, sign out/in so the new\n" +
      "claims take effect.",
  );
}

main().catch((e) => fail(e?.message ?? String(e)));
