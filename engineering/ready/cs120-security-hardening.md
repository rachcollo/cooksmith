# Engineering Package CS-120: Harden recipe import, browser security headers, recipe images and the entry bundle

## Metadata

- **Jira issue:** `CS-120`
- **Jira link:** https://smillins.atlassian.net/browse/CS-120
- **Epic:** Infrastructure & Release (CS-7)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `fix/cs-120-security-hardening`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs120-security-hardening.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C7, C11, C12, C15 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

The public-facing attack surface is closed before wider release: the import function cannot be used as an open fetch proxy, the browser enforces a content policy, and the first load is smaller.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `import-recipe` performs no caller check and has no `config.toml` entry; rate limiting is an in-memory map (`supabase/functions/import-recipe/index.ts:10-19, 101-108`).
- `validateDns` then `fetch` resolves the host twice (`:33-51`).
- `validatePublicUrl('http://[::ffff:127.0.0.1]/')` passes (`supabase/functions/import-recipe/urlSafety.ts:18-33`). Reproduced.
- `vercel.json:13-22` sets three headers and no CSP. Images use any `http(s)` URL (`src/routes/RecipesPage.tsx:771`; DB check `^https?://`).
- Entry chunk 1,288.93 kB (400.26 kB gzip); `observability.ts:1-2` static imports.
- `npm audit --omit=dev`: react-router high (GHSA-qwww-vcr4-c8h2, allow-listed) and fflate moderate.

## Scope

### Included

- Authenticated, durably rate-limited import.
- Address validation covering mapped and NAT64 forms, with connection pinned to the validated address and redirects re-validated.
- CSP and related headers.
- https-only images and a privacy-preserving image path.
- Deferred loading of observability.
- Dependency updates and removal of the allow-list entry.

### Explicitly Out of Scope

- Import content or visibility rules (CS-113).
- Broader penetration testing.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] `import-recipe` rejects requests without a valid signed-in user.
- [ ] Import is rate limited per user in durable storage.
- [ ] Blocked ranges cover IPv4-mapped and NAT64 IPv6 forms and the fetch connects only to the validated address.
- [ ] A Content-Security-Policy is served and every route runs with no violations.
- [ ] Recipe images are https only and do not disclose household IP addresses to arbitrary hosts, or the residual risk is explicitly accepted.
- [ ] The entry chunk is under 250 kB gzip.
- [ ] react-router and fflate are on fixed versions and the audit allow-list entry is removed.

## Technical Direction

- Verify the JWT with `auth/v1/user` as `get-weekly-preparation-plan` does; add an explicit `[functions.import-recipe]` entry.
- Rate-limit table with RLS and a security definer counter.
- Parse addresses numerically rather than by regular expression.
- Start CSP in report-only on preview, then enforce.
- Dynamic import Sentry and PostHog after first paint.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: `recipeUrlSafety` table extended; rate limiter.
- pgTAP for the rate-limit table.
- Playwright: CSP violation listener across `shell.spec.ts` routes.
- Build size assertion in CI.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Yes: rate-limit table.
- **Expected Edge Function:** Yes: import-recipe. Protected release approval required.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** Image option decides: referrer and https hardening only is A$0; re-hosting in Supabase Storage may add storage and egress cost and needs approval.

## Deferred Work and Open Questions

- Image handling: accept hot-linking with `referrerpolicy=no-referrer` and https only (A$0, IP still visible to hosts), or re-host on import (private, possible cost and copyright consideration)?

## Pull Request

Title: `CS-120: Harden recipe import, browser security headers, recipe images and the entry bundle`
