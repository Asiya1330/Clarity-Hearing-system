# MCP Verification Checklist

Run this checklist whenever MCP servers are added, updated, or rotated.

## Pre-flight

- [ ] `.mcp.json` is listed in `.gitignore` — run `git check-ignore -v .mcp.json` and confirm it matches
- [ ] `.mcp.json` is not tracked by git — `git ls-files .mcp.json` returns empty
- [ ] `.mcp.example.json` contains no real tokens — all values are `YOUR_*` placeholders
- [ ] `tests/.auth/` is listed in `.gitignore` — no auth state or fixture IDs committed
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is absent from all source files (only in `.env.local`)

## 1. Playwright MCP

- [ ] `claude mcp list` shows `playwright` with type `stdio`
- [ ] Ask Claude: *"Take a screenshot of http://localhost:3000/auth/login"* → screenshot returned (dev server must be running)
- [ ] Ask Claude: *"Run the Playwright auth test"* → test output returned, no errors from MCP itself
- [ ] Confirm Claude does not use Playwright to navigate to staging or production URLs

## 2. Supabase MCP

- [ ] `claude mcp list` shows `supabase` with type `http`
- [ ] Ask Claude: *"List all tables in the public schema"* → returns table list including `clinics`, `profiles`, `consults`
- [ ] Ask Claude: *"Show RLS policies on the consults table"* → returns policy list
- [ ] Confirm Claude cannot `DROP TABLE` or `DELETE FROM` without explicit human approval in this session
- [ ] Confirm only the OViz Supabase project is accessible (not other orgs)

## 3. GitHub MCP

- [ ] `claude mcp list` shows `github` with type `http`
- [ ] Ask Claude: *"List open issues in this repository"* → returns issue list
- [ ] Ask Claude: *"Show me the last 3 pull requests"* → returns PR list
- [ ] Confirm Claude cannot push to `main` or merge PRs without explicit human approval
- [ ] Confirm only the OViz repository is accessible

## 4. Sentry MCP

- [ ] `claude mcp list` shows `sentry` with type `http`
- [ ] Ask Claude: *"List the most recent Sentry issues for this project"* → returns error list
- [ ] Confirm no PHI appears in returned events (no patient names, photo URLs, consent fields)
- [ ] Confirm `lib/sentry/phi-filter.ts` `beforeSend` hook is active (check Sentry dashboard for scrubbed fields)
- [ ] Confirm Claude cannot delete Sentry events or modify alert rules without explicit approval

## 5. Vercel MCP

- [ ] `claude mcp list` shows `vercel` with type `http`
- [ ] Ask Claude: *"Show me the last 5 deployments for this project"* → returns deployment list with status
- [ ] Ask Claude: *"Show build logs for the latest deployment"* → returns logs
- [ ] Confirm Claude cannot promote a deployment or change env vars without explicit human approval
- [ ] Confirm only the OViz Vercel project is accessible

## Credential hygiene

- [ ] Run `git log --all --full-history -- .mcp.json` → returns empty (never committed)
- [ ] Run `git log --all --full-history -- tests/.auth/` → returns empty
- [ ] Run `git log --all --full-history -- .env.local` → returns empty
- [ ] No `SUPABASE_SERVICE_ROLE_KEY`, `SENTRY_AUTH_TOKEN`, or bearer tokens appear in `git log -p`

## Sign-off

| Check | Date | Reviewer |
| --- | --- | --- |
| All 5 servers verified | | |
| No credentials committed | | |
| PHI filtering confirmed active | | |
| Production write tools confirmed gated | | |
