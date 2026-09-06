# CS-92 handover: Direct post-authentication routing

- **Date:** 2026-09-06
- **Branch:** `fix/cs-92-direct-auth-redirect`
- **Target:** `main`
- **Baseline:** `a410aa4da0c863af15063a8ce61d8074f014dbfd`
- **Status:** Implemented; CI and hosted authentication validation pending

## Objective

Complete the approved CS-92 routing contract by removing the successful email-confirmation stop
and continuing authenticated users directly into Cooksmith.

## Product impact

- **Product Principles supported:** Reduce effort and keep the next action obvious.
- **User effort removed:** The user no longer needs to press **Continue to Cooksmith** after a
  successful email link.
- **Primary next action improved:** Completed users reach their safe intended route, while the
  existing onboarding gate sends incomplete users directly to onboarding.
- **Product behaviour changed:** Yes. The successful `/auth/confirm` state now redirects
  automatically. Failed or stale links retain their existing recovery actions.

## Changes made

- Replaced the successful confirmation card and button with a history-replacing safe redirect.
- Preserved validated internal `returnTo` destinations.
- Kept durable onboarding state as the source of truth for first-time routing.
- Added regression coverage for completed and incomplete users and for removal of the intermediate
  confirmation action.

## Files and components affected

| File or component                                       | Purpose                                            |
| ------------------------------------------------------- | -------------------------------------------------- |
| `src/routes/auth/AuthPages.tsx`                         | Automatically redirects an authenticated callback. |
| `tests/integration/auth-email-flow.test.tsx`            | Covers direct app and onboarding destinations.     |
| `docs/engineering/reports/cs92-direct-auth-redirect.md` | Records implementation and validation evidence.    |

## Migrations

None.

## Setup instructions

None. The already-configured CS-92 Supabase confirmation and magic-link templates remain unchanged.

## Tests run

| Command or check                            | Result              | Notes                                                |
| ------------------------------------------- | ------------------- | ---------------------------------------------------- |
| `npm run preflight`                         | Passed              | Verified Node, npm, branch, remote and Supabase CLI. |
| `npm ci`                                    | Passed              | Installed 426 packages from the lockfile.            |
| `npm run format` and `npm run format:check` | Passed              | No formatting drift.                                 |
| `npm run docs:commands:check`               | Passed              | Audited 166 files before this handover was added.    |
| `npm run lint`                              | Passed              | No warnings.                                         |
| `npm run typecheck`                         | Passed              | Strict TypeScript check passed.                      |
| `npm run test`                              | Passed              | 70 files and 427 tests passed.                       |
| `npm run build`                             | Passed              | Production bundle built successfully.                |
| `npm run db:config:check`                   | Passed              | 55 migrations validated; no migration changed.       |
| Secret and production dependency audits     | Passed              | Existing reviewed browser-only exception retained.   |
| `npm run test:e2e`                          | Environment-limited | Playwright Chromium was not installed.               |
| `npm run test:e2e:install`                  | Environment-limited | Playwright CDN returned 502/timeouts in this runner. |

## Preview or verification instructions

After Vercel creates the Preview, use fresh synthetic links and verify:

1. a completed user opens a magic link and reaches the intended app route without a confirmation
   card or browser refresh;
2. an incomplete user opens a magic link and reaches onboarding without a confirmation card;
3. an invalid or reused link still shows the bounded recovery actions;
4. the callback query is sanitised and no redirect loop occurs.

Hosted Supabase email-link behaviour and a physical iOS email-to-Safari hand-off remain unverified
until the Preview is available.

## Accessibility, security, privacy and cost

- **Accessibility:** Removes an unnecessary interaction; loading and failure states remain semantic.
- **Security and privacy:** Uses the existing `safeReturnPath` open-redirect protection and existing
  authenticated onboarding gate. No callback value, user data or provider detail is persisted.
- **Cost impact:** A$0 per month and A$0 per year.
- **Credential check:** No credential, token, real email or household data is included.

## Known limitations

Local Playwright execution was unavailable because the browser binary could not be downloaded.
GitHub Actions, Vercel Preview and hosted authentication validation remain required.

## Deferred work

None within the CS-92 correction.

## Rollback approach

Revert the application commit to restore the intermediate confirmation action. No database,
Supabase template or provider rollback is required.

## Recommended next milestone

Complete CS-92 Preview and physical-device authentication verification before starting another
authentication milestone.
