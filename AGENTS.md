# AGENTS.md

## Cursor Cloud specific instructions

This is **OViz** — a single Next.js 16 (App Router) + Supabase application (not a
monorepo). Package manager is **npm** (`package-lock.json`, Node `>=20.9.0`; the VM
ships Node 22). There is one web service plus a local Supabase stack as its backend.

### Services

| Service | Required? | How to run | Notes |
| --- | --- | --- | --- |
| Next.js web app (port 3000) | Yes | `npm run dev` | The product. Needs Supabase env vars set (see below). |
| Supabase local stack (API :54321, DB :54322, Studio :54323) | Yes for DB-backed flows | `supabase start` then `supabase db reset` | Requires Docker + the Supabase CLI. `db reset` applies `supabase/migrations/` and loads `supabase/seed.sql`. |
| Resend / Stripe / Sentry | No | n/a | All optional and fail-soft. Intake email falls back to "copy link"; Stripe billing renders disabled; Sentry is no-op if DSN unset. |

Standard commands live in `package.json` (`dev`, `build`, `start`, `lint`,
`test`, `typecheck`) and the `README.md` (see Scripts / Environment variables /
E2E sections). Don't duplicate them — read those.

### First-time run setup (not handled by the startup update script)

The startup update script only runs `npm install`. Bringing the DB-backed app up
end-to-end also needs these one-off, non-`npm` steps:

1. **Docker** must be installed and the daemon running (it is a system dependency,
   so it is intentionally not in the update script). In this Firecracker VM, Docker
   needs `fuse-overlayfs` storage driver and `iptables-legacy` (see the system
   setup notes for the exact install recipe).
2. **Supabase CLI** — not a project dependency. Install it, or use it via
   `npx supabase ...`.
3. **`.env.local`** — `cp .env.example .env.local` and fill in the Supabase values.
   For the local stack, set `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and
   copy the `anon`/`publishable` and `service_role` keys printed by `supabase start`
   into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
   Resend/Stripe/Sentry vars can be left blank.

### Seeded test logins (local stack only)

`supabase db reset` seeds 9 clinic tenants (`@oviz-testing.ca`) defined in
`tests/fixtures/mock-tenants.json`. The seed has a guard that **aborts if any
non-test user exists**, so it only ever runs against a fresh local/test DB. Example
login for a hello-world (pro clinic owner):

- email: `test.clinic1.admin@oviz-testing.ca`
- password: `V2AWv+@ueWE7xfWx`

Sign in at `/auth/login`, then create a consult at `/consults/new` (or via the
dashboard) to exercise core functionality. The owner-console (`/ops/...`) is gated
behind a hardcoded owner + TOTP MFA; grant access once via
`node --env-file=.env.local scripts/bootstrap-owner-console.mjs`.

### Network egress caveat (important)

During at least some cloud-agent sessions, outbound network is **restricted to an
allowlist that excludes `registry.npmjs.org`, `download.docker.com`, and GitHub
release asset hosts** (only `github.com`/`api.github.com` were reachable; other
hosts fail TLS with `ECONNRESET`). When egress is restricted you **cannot** run
`npm install`, install Docker, or download the Supabase CLI in-session. The startup
update script (`npm install`) is expected to run during provisioning when network
is available; if `node_modules` is missing and the registry is unreachable, the
environment is blocked on network access rather than on a code/config problem.

### Lint / test / build

See `README.md` Scripts table. All of `npm run lint`, `npm run typecheck`,
`npm run test` (Vitest), and `npm run build` require a completed `npm install`.
The Playwright E2E suite (`npx playwright test`) additionally needs the dev server
plus a running Supabase stack and the `E2E_*` / `SUPABASE_SERVICE_ROLE_KEY` env vars
documented in the README.
