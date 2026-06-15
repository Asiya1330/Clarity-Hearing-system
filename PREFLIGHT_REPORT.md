# OViz Pre-Production Preflight Report

**Date:** 2026-06-13 · **Branch:** `feature/intake-modes` · **Next.js:** 16.2.4 (Turbopack) · **Node:** v24.16.0 (≥18.18 ✓)

## Result
**DO NOT SHIP — yet.** The code is in shippable shape (all static gates + unit tests green, feature audit clean, every hard invariant intact), but **two environment prerequisites must be satisfied first**: the intake migration is not applied to the target database, and the service-role key env var is named in a way the app runtime won't read. Neither is a code defect.

## Gates

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** (0 errors) |
| Lint | `npm run lint` | **PASS** (0 errors) |
| Build | `npm run build` | **PASS** (31 routes, no boundary/runtime warnings) |
| Vitest | `npm test` | **PASS** (47/47) |
| Playwright | `npx playwright test` | **BLOCKED(env)** — 18/20 pass; 2 blocked on unapplied migration |

Static gates and unit tests required **no source changes** — they were already clean on arrival.

## Fixes applied
All fixes were to **test files / test harness only** (the brief's Phase 3 audit found no app defects):

- **`1c9faba`** — `tests/consult.spec.ts`, `tests/branding.spec.ts`: the specs predated the new chooser + redesigned 6-step wizard. Fixed wrong testid `start-consult-btn` → `start-consult-button` (consult test 1, branding test 16); drove test 1 through dashboard → `/consults/start` chooser → `mode-in-clinic` → wizard (with a `networkidle` wait to avoid a pre-hydration dead-click on the `<Link>`); added a step to advance past the new "Patient information" step 1 in tests 2–7. **Selectors/navigation only — no assertion weakened, no coverage removed.** Relates to the Playwright gate.
- **`60ae44f`** — `playwright.config.ts`, `tests/setup/auth.setup.ts`: pre-existing working-tree harness changes (configurable `PW_BASE_URL`/port 3001, service-role key mapping for `globalSetup`, hydration-safe login wait). Verified correct; committed for reviewability.
- **`3764efb`** — `app/(app)/consults/start/page.tsx`, `components/consult/start-intake-form.tsx`: IDE ESLint-on-save autofixes that appeared mid-session (removed an unused `lucide-react` import; escaped apostrophes). Benign; testids and required strings unchanged. Verified typecheck/lint still pass.

## Invariants (§1) — all hold
1. **Calculator frozen** — `git diff --stat -- lib/calculators/impact.ts` empty; `annualPartnerHours.toFixed(1)` present in both results UI and report. ✓
2. **All 35 testids present** — including `mode-email-submit`/`mode-kiosk-submit`, which are produced by the template literal `` data-testid={`${mode}-submit`} `` in `start-intake-form.tsx:230`. ✓
3. **All required UI strings present**, `{n} of 3 selected` rendered via `{count} of {MAX_LISTENING_SITUATIONS=3} selected`; **`Hearing Impact Visualizer` absent everywhere.** ✓
4. **Security boundary** — `supabase/admin.ts`/`SUPABASE_SERVICE_ROLE_KEY` referenced only in server code (intake routes, onboarding route, the server-component intake page, test setup); none in any `"use client"` file; the real 219-char service-role secret is **not** present in `.next/static` (client bundle). ✓
5. **Intake security model** — tokens single-use (`used_at` guard) + time-limited (kiosk 4h / email 7d); all validation failures return one shared 404; `intake_links` migration has clinic-scoped RLS and **no anon policies**; public submission uses the service-role client only after `loadOpenIntake` validation; status-guarded update (`.eq("status","awaiting_patient")`) prevents double-submit; lifecycle is `awaiting_patient → patient_complete → completed`. ✓

Nothing had to be restored — no invariant broke during fixing.

## Feature-correctness audit (§3) — no defects
Traced and verified correct: dashboard CTA → `/consults/start` chooser (3 modes) → in-clinic → unchanged wizard; `POST /api/intake` (status `awaiting_patient`, random 24-byte token, sensible TTLs, **email best-effort — missing `RESEND_API_KEY` returns the link with a copy message, never 500s**); `GET/POST /api/intake/[token]` (identical 404 for missing/used/expired/non-awaiting, zod 422, double-submit guard); `POST /api/consults/[id]/complete` (409 missing responses, 422 out-of-range, merge → re-validate → `calculateImpact` → `completed`); `PatientIntake` reuses the wizard step components and submits only the patient subset; consult detail handles all three states without assuming a model run exists; zod schemas derived via `.pick()` from `ConsultInputSchema` (ranges centralized, picks partition the schema exactly).

## Environment blockers
1. **Migration `20260612_006_intake_modes.sql` is NOT applied** to the target DB (`kjufynstdouuigkbraic`). Verified live: `intake_links` table absent; `consults.intake_mode` / `patient_responses` / `patient_responses_submitted_at` columns absent; 0 RLS policies on `intake_links`. **Consequence:** the `/consults/[id]` detail page selects the missing columns → query error → `notFound()`, so it 404s for *every* consult, and the entire intake feature is non-functional. This is the sole cause of the 2 Playwright failures (`report` outcome-capture, `photos-pro` consent). **Fix (human):** apply the migration to the target DB (`supabase db push`, or apply `supabase/migrations/20260612_006_intake_modes.sql` via the Supabase SQL editor / MCP `apply_migration`). It was **not** applied during this preflight — schema changes to a live/possibly-production DB are an explicit human prerequisite per the rules of engagement.
2. **`SUPABASE_SERVICE_ROLE_KEY` is not set in `.env.local`** — only `NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY` is. The app reads `process.env.SUPABASE_SERVICE_ROLE_KEY` (`admin.ts:12`), so a standalone `next dev`/production server would throw in `createAdminClient()` on every public intake request. It works under Playwright only because `playwright.config.ts` maps the name and the spawned dev server inherits it. **Fix (human):** ensure the deploy environment (and local `.env.local`) defines `SUPABASE_SERVICE_ROLE_KEY` directly.

## Needs human decision
- **`NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local`** (47-char value — *not* the real 219-char secret, and confirmed absent from the client bundle since no bundled code references it). It is not currently leaking, but the `NEXT_PUBLIC_` prefix on anything named "service role key" is a serious footgun and the Playwright config reads it as a fallback. Recommend removing/renaming it and the fallback. (Env-only; the file cannot be edited safely without knowing intent.)
- **`tests/intake-flow.spec.ts` does not exist** — the brief states it does and "exercises all three modes," but it's absent. The new intake feature therefore has **zero e2e coverage.** It was not fabricated (it can't run until the migration is applied, and authoring a full suite is out of scope for a fix). Decide whether to author it post-migration.
- **Email intake delivery** (`RESEND_API_KEY` / `INTAKE_EMAIL_FROM` unset): by design this degrades to "copy the link." Decide whether live email should be configured for production.

## Residual risk (verify post-deploy)
- **Live RLS / token behavior:** clinic-scoped RLS, single-use + expiry enforcement, and the generic-404 contract are verified by code reading and the migration SQL, but not exercised end-to-end here (migration unapplied). Smoke-test the full email + kiosk + in-clinic round trip against a migrated DB.
- **Live email delivery** via the Resend REST call is unverified (no key). Send one real email-intake and confirm receipt + link validity.
- **Standalone runtime service-role wiring** — confirm `SUPABASE_SERVICE_ROLE_KEY` resolves in the deployed environment (not just under the Playwright shim) by hitting `/api/intake` once post-deploy.

**Bottom line:** Merge-ready from a code standpoint. Apply the migration and fix the service-role env var name, then Playwright will go fully green and the app is shippable.
