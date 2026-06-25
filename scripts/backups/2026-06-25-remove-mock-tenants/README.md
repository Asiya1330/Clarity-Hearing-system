# Backup — remove-mock-tenants (2026-06-25)

Point-in-time logical export taken immediately before deleting the mock/demo
tenants from **`kjufynstdouuigkbraic` (oviz-production)**.

## What was deleted (and is captured here)
- **38 `auth.users`**: the 36 `@oviz-testing.ca` UAT seed accounts + `e2e-pro@oviz-e2e.test` + `admin@processpath.ca`
- **10 `clinics`**: the 9 UAT seed clinics + `OtoVantage Demo Clinic`
- **10 `locations`**, **37 `profiles`**, **27 `clinic_invites`**, **3 `consults`** (OtoVantage; empty patient names)
- 0 model_runs / reports / outcomes / recommendations / share_links / intake_links / ear_fit_photos / storage objects

## What was KEPT (not in this backup)
- `Clear Hearing Center` clinic + owner `stlem@atdi.ca` + all its data (36 consults, etc.)
- `sl@evear.ca` login (its profile survived with `clinic_id = NULL`)
- `drlydia.aud@gmail.com` (possible real lead)

## Files
- `backup-auth-and-profiles.json` — the deleted `auth.users` (incl. bcrypt password hashes + metadata) and `profiles`.
- `restore-public-rows.sql` — re-insertable `clinics` → `locations` → `consults` → `clinic_invites` (idempotent).

## How to restore
1. **Easiest (full):** Supabase dashboard → *Database → Backups* → restore the automated/PITR snapshot from just before 2026-06-25. This brings back `auth`, `public`, and storage together.
2. **Logical (surgical):**
   a. Recreate the 36 UAT auth users + profiles (original UUIDs + known passwords):
      `node scripts/seed-uat-tenants.mjs --env=.env.local.prod.bak --apply`
      (For `OtoVantage`/`e2e-pro`/`admin@processpath.ca`, re-create from `backup-auth-and-profiles.json` via the Admin API or `auth.users` insert using the captured `id` + `encrypted_password`.)
   b. Run `restore-public-rows.sql` against the project to restore the clinics/locations/consults/invites.

> Note: `restore-public-rows.sql` must run AFTER the auth users exist
> (`clinic_invites.invited_by` and `consults.clinician_id` reference them).
