# OViz Control Room — Secure Owner/Staff Console — Implementation Report

Branch: `feature/secure-owner-console`
Scope: an additive, hidden backend SaaS-management console for the SaaS owner
(`sl@evear.ca`) and trusted staff, with mandatory TOTP MFA. The existing clinic
app, clinic-level `/admin`, intake/kiosk, reports, calculators, and auth are
untouched except for the explicitly-scoped enforcement hooks below.

---

## 1. Baseline (before changes)

All run on the new branch off `feat/premium-redesign-kiosk`:

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ pass |
| `npm test` | ✅ 85 tests pass (7 files) |
| `npm run build` | ✅ exit 0 |

No pre-existing failures. (`npm ci` was intentionally NOT run: `node_modules`
was already installed and intact, and a reinstall carried needless risk to a
working tree. The lockfile is present and unchanged.)

---

## 2. Final validation (after changes)

| Command | Result |
| --- | --- |
| `npm run typecheck` | ✅ pass |
| `npm run lint` | ✅ pass (0 errors, 0 warnings) |
| `npm test` | ✅ 108 tests pass (10 files) — +23 new owner-console tests |
| `npm run build` | ✅ exit 0 — all new routes prerender as Partial Prerender (static shell + Suspense-streamed dynamic content); APIs dynamic; proxy active |

Playwright: see §10 (Testing).

---

## 3. Database migration

`supabase/migrations/20260620120000_owner_console.sql` — **additive + idempotent**
(timestamp is later than the previous newest, `20260619181940`). No existing
table/column/policy is dropped or altered behaviourally.

- `clinics` new columns: `account_status` (`active|suspended`, default active),
  `suspended_at/_by/_reason`, `stripe_customer_id`, `stripe_subscription_id`,
  `stripe_sync_status` (`not_configured|not_applicable|synced|sync_failed`),
  `stripe_last_synced_at`.
- `owner_console_entitlements` (per-clinic feature flags).
- `admin_audit_logs` — **append-only**: RLS on, no client policies; a trigger
  blocks UPDATE/DELETE for everyone (including the service role).
- `email_logs` — masked + hashed recipient only (never raw); RLS on, no client
  policies.
- `intake_links` new columns: `revoked_at/_by/_reason`.
- `kiosk_session_events` — kiosk lifecycle audit; RLS on, no client policies.
- Indexes: `clinics(account_status)`, `clinics(stripe_customer_id)`,
  `clinics(stripe_subscription_id)`, `admin_audit_logs(created_at desc)`,
  `admin_audit_logs(target_clinic_id, created_at desc)`,
  `email_logs(clinic_id, created_at desc)`,
  `intake_links(clinic_id, mode, expires_at)`, `intake_links(revoked_at)`.

RLS rule honoured: owner-console tables have **no** authenticated/anon policies;
all access is server-side service-role after `requireOwnerConsoleAccess()`.

> The migration file is authored only — it is NOT applied to any database by
> this work. Apply per the deployment checklist (§11).

---

## 4. New routes

Hidden auth (noindex/nofollow):
- `/auth/oviz-control-room` — login (email + password).
- `/auth/oviz-control-room/mfa` — TOTP enrol/verify (Google Authenticator compatible).

Console (route group `(owner-console)`, URL `/ops/oviz-control-room`, noindex):
- `/ops/oviz-control-room` (Overview), `/clinics`, `/clinics/[clinicId]`,
  `/clinics/[clinicId]/support-view`, `/staff`, `/audit`, `/email-auditor`,
  `/kiosk-sessions`, `/health`.

API (`/api/owner-console/*`, all POST-only, same-origin verified, zod-validated,
audited, generic errors):
- `clinics/[clinicId]/suspend` · `…/reactivate` (super_admin)
- `clinics/[clinicId]/entitlements` · `…/diagnostic-email` (console user)
- `clinics/[clinicId]/billing/extend-trial` · `…/billing/apply-coupon` (super_admin)
- `clinics/[clinicId]/support-view` (open/close audit)
- `kiosk-sessions/[linkId]/revoke` · `email-logs/[id]/resend` (console user)
- `staff/invite` · `staff/[userId]/revoke` · `staff/[userId]/role` (super_admin)

Other: `/account-suspended` (noindex).

Not linked from the public site or clinic app nav.

---

## 5. Files changed

**New libraries** (`lib/owner-console/`): `constants.ts`, `paths.ts`
(client-safe — no owner email), `claims.ts` (pure, edge-safe predicates),
`auth.ts` (server guards + API guards + same-origin), `observability.ts`
(Sentry tagging), `audit.ts`, `account-status.ts`, `billing.ts`,
`entitlements.ts`, `staff.ts`, `kiosk.ts`, `clinics.ts`, `emails.ts`,
`config-status.ts`, `health.ts`, `zod.ts`. Plus `lib/email/resend.ts`,
`lib/clinic-access.ts`.

**Edited (carefully scoped):**
- `lib/supabase/admin.ts` — backward-compatible service-role key resolution
  (`SUPABASE_SERVICE_ROLE_KEY` → legacy `NEXT_SECRET_…` fallback; never
  `NEXT_PUBLIC_`), `isUsingLegacyServiceRoleKey()`.
- `lib/supabase/proxy.ts` — owner-console route gate (claims-based; preserves
  existing cookie/session + `/auth`,`/intake`,`/api/intake` behaviour).
- `app/(app)/layout.tsx` — `SuspensionGate` blocks suspended clinics.
- `app/api/intake/route.ts` — suspension check, kiosk entitlement gate, email
  logging (copy-link fallback preserved).
- `app/api/intake/[token]/route.ts` + `app/intake/[token]/page.tsx` — revoked
  links + suspended clinics → same generic "unavailable" response.
- `app/api/consults/route.ts`, `…/consults/photo-consent/route.ts`,
  `…/photos/signed-upload/route.ts`, `…/photos/mark-uploaded/route.ts` —
  suspended-clinic rejection.
- `components/intake/patient-intake.tsx` — kiosk polling ejects on 404.
- `components/auth/auth-shell.tsx` — optional `showBackLink` (default true).

**Components** (`components/owner-console/`): console shell/nav/logout, login,
MFA, clinic actions, staff manager, kiosk-revoke, email-resend, support-view
tracker, shared UI.

**Tests**: `lib/owner-console/auth.test.ts`, `lib/owner-console/audit.test.ts`,
`lib/clinic-access.test.ts`.

**Scripts/docs/env**: `scripts/bootstrap-owner-console.mjs`, `.env.example`,
this report.

---

## 6. Environment variables

| Var | Purpose | If missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | app cannot run |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase | app cannot run |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role (server-only) | console + intake service ops fail; legacy `NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY` accepted as a deprecated fallback |
| `RESEND_API_KEY`, `INTAKE_EMAIL_FROM` | email | intake still works (copy-link); console email actions disabled |
| `STRIPE_SECRET_KEY` | billing (server-only) | billing actions show a disabled state |
| `STRIPE_RETENTION_COUPON_ID` | retention coupon | apply-coupon disabled |
| `STRIPE_DASHBOARD_MODE` | deep-link mode (`live`/`test`) | defaults to `live` |
| `OWNER_CONSOLE_AUDIT_HASH_SALT` | audit IP/UA hashing | non-secret constant fallback (set a long random value in prod) |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | monitoring | Sentry disabled |

`.env.example` updated accordingly (`SUPABASE_SERVICE_ROLE_KEY` is now canonical;
`NEXT_SECRET_…` retained as a commented deprecated fallback).

---

## 7. Owner bootstrap (run once, secure terminal)

```bash
node --env-file=.env.local scripts/bootstrap-owner-console.mjs
```

Finds or invites `sl@evear.ca` and sets
`app_metadata = { oviz_console_enabled: true, oviz_console_role: "super_admin" }`.
Does not set or print a password; prints no secrets. Then sign in at
`/auth/oviz-control-room` and set up MFA.

> Even without the bootstrap, the owner is authorized by email everywhere
> (proxy + guards), and the guard self-repairs the owner's `app_metadata` via
> the service role on first console access (non-blocking; never refreshes the
> session in a server component, which avoids the rotated-refresh-token logout
> hazard).

---

## 8. Security decisions

- **Authorization source**: owner email OR `app_metadata.oviz_console_enabled` +
  valid `oviz_console_role`. NEVER `public.profiles.role` (that governs clinic
  admin, a different surface).
- **Defence in depth**: Edge proxy gate → server guard on every page → server
  guard on every API route. The hidden URL is not treated as security.
- **Mandatory MFA**: AAL2 required for all console pages and APIs (owner
  included). Enrol/verify uses Supabase TOTP (Google Authenticator compatible);
  no Google OAuth introduced.
- **Owner immutability**: `sl@evear.ca` cannot be revoked, disabled, or demoted;
  staff actions hard-block the owner target.
- **Role split**: super_admin = suspend/reactivate, billing, staff; sub_admin =
  read + entitlements + diagnostic email + kiosk revoke + email resend + support
  view. Sub-admin support view shows no clinical detail.
- **Append-only audit**: `admin_audit_logs` UPDATE/DELETE blocked by trigger for
  everyone incl. service role. Every destructive action audited.
- **Generic errors / no enumeration**: auth + console errors are generic; the
  console never reveals it exists or who may access it.
- **PHI/PII**: no patient names/emails/clinical values anywhere in the console.
  Audit + email logs store masked + salted-HMAC values only; full IP/UA never
  stored. Sentry events tagged `surface: owner_console`, `admin_dashboard: true`,
  `owner_console_action: <action>`; the existing `lib/sentry/phi-filter.ts` is
  unchanged and still the last line of defence.
- **Secrets**: service-role / Stripe / Resend secret VALUES are read only in
  server modules. Verified the production client bundle contains neither the
  owner email nor any secret value (the only `service_role` match in client JS
  is the PHI-filter redaction word-list).
- **Same-origin**: every destructive route is POST-only and verifies `Origin`
  (or `Sec-Fetch-Site: same-origin`).
- **Stripe/local consistency**: suspend pauses Stripe FIRST and only flips local
  `account_status` on success; failure leaves status unchanged and marks
  `stripe_sync_status = sync_failed` + Sentry alert. Reactivate resumes first.

### Security grep results
- `SUPABASE_SERVICE_ROLE_KEY` — only in server files (`lib/supabase/admin.ts`,
  `lib/owner-console/config-status.ts`, the Overview page's env-warning **display
  text**, server scripts), `.env.example`, docs, tests. No client component reads
  it.
- `NEXT_PUBLIC_.*SERVICE_ROLE` — no code reads a NEXT_PUBLIC service-role key.
  Matches are error-message strings spanning
  "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", plus pre-existing
  docs/Playwright config. **Pre-existing finding (not introduced here):**
  `PREFLIGHT_REPORT.md` notes a `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in
  `.env.local` — recommend removing that env var (our code never reads it).
- `sl@evear.ca` — only server-only constants, the bootstrap script, migration/
  doc comments, and a test. Not page copy; not in the client bundle.
- `STRIPE_SECRET_KEY` / `RESEND_API_KEY` — values read only in
  `lib/owner-console/stripe.ts` / `lib/email/resend.ts`. Client `clinic-actions`
  references the variable NAMES in disabled-state copy only (no value access).

---

## 9. Features implemented / disabled-when-unconfigured

Implemented: hidden login + mandatory TOTP MFA; Overview (stats, integration
status, env warnings, recent audit, DB status); global Clinics table
(search/paginate, no PHI); Clinic detail (Stripe deep links, support snapshot,
audit timeline, action panels); suspend/reactivate (Stripe-first, confirm-text,
reason); entitlements (kiosk/presentation/AI-beta + notes); billing (extend
trial 14d, apply retention coupon); diagnostic + password-reset email; email
auditor (masked, status filter, safe resend-to-owner); kiosk sessions (force
kill → revoke + audit + patient ejected); staff management; append-only audit;
health page.

Safe disabled states (documented blocker, no hallucinated behaviour):
- **Stripe** unset → all billing actions disabled with a clear message; suspend
  records `stripe_sync_status = not_configured`.
- **Resend** unset → console email actions disabled; intake still issues
  copy-links.
- **`STRIPE_RETENTION_COUPON_ID`** unset → apply-coupon disabled.
- **Presentation Mode / Audiogram-AI beta** → persisted entitlement flags + typed
  helpers; no user-facing behaviour changed (no existing flag location to wire
  without altering report behaviour), per the "don't change report rendering"
  constraint. Kiosk Mode IS wired (intake route 403s when disabled).

Known caveats (no silent guessing):
- **Email resend** targets the **clinic owner**, not the original recipient —
  raw recipient addresses are deliberately not retained for privacy.
- **Stripe coupon** uses the long-stable `coupon` field on subscription update;
  an account pinned to a very new API version may require `discounts[]` instead.
  Failures surface an error code (never silent). See `lib/owner-console/stripe.ts`.
- **Staff invite** of a brand-new email needs Supabase email/SMTP configured;
  promoting an existing account always works.

---

## 10. Testing

Unit (vitest): `auth.test.ts` (12) — owner/role/console/MFA predicates incl.
case/whitespace and privilege-escalation guards; `audit.test.ts` (6) — HMAC
determinism + non-identifying hashing; `clinic-access.test.ts` (5) — suspension
mapping incl. onboarding safety. All pass; total 108.

Playwright smoke tests were **not** added in this pass. The existing harness can
authenticate a normal clinic user, but exercising the console requires a TOTP
secret + an AAL2 session, which the current global-setup does not provision.
Rather than ship a flaky/partial E2E, the access perimeter is covered by unit
tests (claims/role/MFA logic) + the proxy/guard/route code paths. Recommended
next step: extend `tests/setup` to mint a TOTP factor for a seeded owner and add
the smoke flows (hidden login renders, unauthenticated console redirects, normal
user denied, suspended page appears). Documented here rather than stubbed.

---

## 11. Deployment checklist

1. Back up the production database.
2. Apply the migration to **staging** (`supabase db push` / MCP apply_migration).
3. Run the bootstrap script in staging for `sl@evear.ca`.
4. In the Supabase dashboard, ensure **MFA/TOTP** is enabled for the project.
5. Verify hidden login + MFA enrol/verify.
6. Verify owner console access (AAL2).
7. Verify a normal clinic user is denied the console (redirect to `/auth/error`).
8. Verify suspend/reactivate on a staging tenant (and `/account-suspended`).
9. Verify Stripe disabled state with no key; with a test key, verify pause/resume
   sync in Stripe test mode.
10. Verify Resend diagnostic email (and copy-link fallback when unset).
11. Verify kiosk force-kill invalidates the link (patient ejected to `/kiosk`).
12. Run `npm run typecheck && npm run lint && npm test && npm run build`.
13. Apply the migration to **production**.
14. Run the bootstrap script in production.
15. Set `OWNER_CONSOLE_AUDIT_HASH_SALT` (long random) and migrate
    `NEXT_SECRET_SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` in
    Vercel; remove any `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.
16. Deploy via the existing GitHub/Vercel flow only after all gates pass.

---

## 12. Rollback plan

- **Code**: revert the feature branch / PR.
- **Database**: do NOT drop `admin_audit_logs` (the immutable trail) by default.
  All migration changes are additive; leave the columns/tables in place unless a
  human explicitly approves dropping them.
- **Feature disable without code rollback**: remove `oviz_console_*` app_metadata
  from staff users (except `sl@evear.ca`); the proxy keeps the hidden routes
  unreachable for everyone else.
