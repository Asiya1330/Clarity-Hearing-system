2026-06-12 — Intake modes migration and intake flow

- Added migration: `supabase/migrations/20260612_006_intake_modes.sql` which introduces intake fields and `intake_links` table.
- Deployment notes: the migration must be applied to staging/production using the Supabase CLI or UI.
- Security: the intake flow requires a service role key for server-side token operations — set `SUPABASE_SERVICE_ROLE_KEY` in the target environment before enabling public intake links.

Testing: run end-to-end tests (`npx playwright test` or `npm run test`) after applying the migration to verify intake flows (kiosk, email, in-clinic).
