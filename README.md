# OViz by OtoVantage

Evidence-informed educational consult aid for hearing care providers. Built with Next.js 15 App Router, Supabase, and Tailwind CSS.

## Quick start

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and Sentry vars
npm install
npm run dev          # http://localhost:3000
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint on `app components lib tests` |
| `npm run test` | Vitest unit tests |
| `npx playwright test` | E2E test suite (requires dev server) |

## Environment variables

Copy `.env.example` to `.env.local` and fill in all values. Never commit `.env.local`.

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | E2E tests only | Service role key — never expose to browser |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Sentry DSN for client-side error capture |
| `SENTRY_DSN` | Yes | Sentry DSN for server-side error capture |
| `SENTRY_ORG` | CI only | Sentry org slug for source-map upload |
| `SENTRY_PROJECT` | CI only | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | CI only | Sentry auth token for source-map upload |
| `E2E_PRO_EMAIL` | E2E tests | Pro-clinic test user email |
| `E2E_PRO_PASSWORD` | E2E tests | Pro-clinic test user password |
| `E2E_STARTER_EMAIL` | E2E tests | Starter-clinic test user email |
| `E2E_STARTER_PASSWORD` | E2E tests | Starter-clinic test user password |

## E2E tests

Tests use Playwright with two browser contexts: a pro-clinic user and a starter-clinic user. `globalSetup` creates isolated Supabase test fixtures; `globalTeardown` removes them.

```bash
npx playwright test              # run all tests
npx playwright test --ui         # interactive UI mode
npx playwright show-report       # view last HTML report
```

## Security rules

- `clinic_id` is always derived server-side from `auth.uid()` via `current_clinic_id()` — never trusted from the client.
- Photos require stored consent and a pro/enterprise subscription plan.
- Patient photos are stored in private Supabase buckets and served via signed URLs only.
- `SUPABASE_SERVICE_ROLE_KEY` is only used in `globalSetup`/`globalTeardown` and server-side API routes — never exposed to the browser.

---

## MCP Integration

OViz uses five MCP (Model Context Protocol) servers with Claude Code to enable AI-assisted development. All servers are connected via OAuth or personal access tokens stored in `.mcp.json` (gitignored). Never commit `.mcp.json`.

Copy `.mcp.example.json` to `.mcp.json` and replace placeholder values.

### Configured servers

#### 1. Playwright — browser automation

- **Transport:** stdio (`npx @playwright/mcp@latest`)
- **Allowed:** run E2E tests, inspect test output, take screenshots of local app
- **Not allowed:** modify test fixtures, delete test users
- **Add:** `claude mcp add playwright -- npx -y @playwright/mcp@latest`
- **Verify:** Ask Claude: *"Run the auth test and show me the result."*

#### 2. Supabase — database and schema inspection

- **Transport:** HTTP (`https://mcp.supabase.com/mcp`)
- **Allowed:** read schema (`information_schema`), inspect RLS policies, run read-only SQL, list migrations
- **Not allowed:** drop tables, modify production data, bypass RLS, access other Supabase orgs
- **Add:** `claude mcp add --transport http supabase https://mcp.supabase.com/mcp`
- **Verify:** Ask Claude: *"List all tables in the public schema."*

#### 3. GitHub — issue and PR management

- **Transport:** HTTP (`https://api.githubcopilot.com/mcp/`)
- **Allowed:** read issues and PRs, create draft PRs, comment on issues
- **Not allowed:** force-push, merge without review, delete branches, access unrelated repos
- **Add:** `claude mcp add --transport http github https://api.githubcopilot.com/mcp/`
- **Verify:** Ask Claude: *"List open issues in this repository."*

#### 4. Sentry — error monitoring

- **Transport:** HTTP (`https://mcp.sentry.dev/mcp`)
- **Allowed:** read error events, list issues, view stack traces
- **Not allowed:** delete events, modify alert rules, access other Sentry orgs
- **PHI note:** Sentry is configured with `beforeSend` PHI filtering (`lib/sentry/phi-filter.ts`). Never log patient data.
- **Add:** `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
- **Verify:** Ask Claude: *"Show me the most recent Sentry issues for this project."*

#### 5. Vercel — deployment inspection

- **Transport:** HTTP (`https://mcp.vercel.com`)
- **Allowed:** list deployments, read build logs, inspect runtime logs, check deployment status
- **Not allowed:** promote deployments, change env vars in production, delete projects
- **Add:** `claude mcp add --transport http vercel https://mcp.vercel.com`
- **Verify:** Ask Claude: *"Show me the last 5 deployments for this project."*

### MCP safety rules

1. No MCP server credentials are stored in project files. `.mcp.json` is gitignored.
2. Supabase MCP may only read schema and run read-only queries. All write operations go through the application's API routes with RLS.
3. Vercel MCP may not change environment variables or promote to production without explicit human approval.
4. GitHub MCP may not merge PRs or push to protected branches without explicit human approval.
5. Sentry MCP must not surface raw request bodies, storage URLs, or fields matching `patient*`, `photo*`, `consent*`.
6. Playwright MCP runs only against `http://localhost:3000` (dev server). It must not target staging or production URLs.

### Verification checklist

See `docs/mcp-verification-checklist.md` for the full pass/fail audit procedure.
