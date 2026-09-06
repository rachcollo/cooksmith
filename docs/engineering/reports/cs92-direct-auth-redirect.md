# CS-92 implementation report: Direct post-authentication routing

## Outcome

Successful email authentication now continues directly into Cooksmith. The `/auth/confirm` route
uses a history-replacing redirect to the validated internal `returnTo` destination, or application
home when no destination was requested. The existing onboarding gate then reads durable Cooksmith
state and sends incomplete users to onboarding.

The intermediate **Email confirmed** card and **Continue to Cooksmith** action have been removed
from the successful path. Unauthenticated, invalid, expired and reused-link recovery remains
unchanged.

## Technical scope

- Baseline: `main` at `a410aa4da0c863af15063a8ce61d8074f014dbfd`
- Branch: `fix/cs-92-direct-auth-redirect`
- Application files changed: one
- Test files changed: one
- Documentation files added: two
- Migrations: none
- Edge Functions: none
- Dependencies: none
- Supabase hosted configuration: unchanged

## Validation

Passed locally:

- `npm run preflight`
- `npm ci`
- `npm run format`
- `npm run format:check`
- `npm run docs:commands:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`, 70 files and 427 tests
- `npm run build`
- `npm run db:config:check`, 55 migrations
- `npm run engineering:check-secrets`
- `npm run security:audit-production`
- `git diff --check`

The focused authentication, bootstrap and onboarding run passed 22 tests across three files before
the full suite.

`npm run test:e2e` could not launch because this runner did not contain the pinned Playwright
Chromium binary. `npm run test:e2e:install` was attempted, but the Playwright CDN returned a 502
and repeated timeouts. Browser coverage remains a GitHub Actions and Preview requirement.

## Hosted validation

The Vercel Preview must verify fresh magic links for both a completed synthetic user and an
incomplete synthetic user. The completed user must reach the intended route automatically. The
incomplete user must reach onboarding automatically. Neither flow may show the confirmation card,
require a browser refresh or leave sensitive callback parameters in the URL.

Hosted validation has not yet been claimed. No Production project, real user, real household or
hosted Supabase configuration was accessed.

## Safety and rollback

The redirect continues through the existing `safeReturnPath`, `RequireAuth` and `OnboardingGate`
contracts. It does not change identity verification, session establishment, household access or
RLS. Recovery remains available when no authenticated user exists.

Rollback is a normal revert of the application commit. No migration or Supabase configuration
rollback is needed. Fixed cost impact is A$0 per month and A$0 per year.
