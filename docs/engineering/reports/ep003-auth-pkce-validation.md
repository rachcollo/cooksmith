# EP003 PKCE bootstrap validation report

## Status

Implemented with automated application checks passing. Hosted magic-link verification remains required on a preview deployment.

## Baseline

Branch: `ep003-auth-pkce-validation`.

Baseline commit inspected before implementation: `4bcbf5e fix(auth): bootstrap session before mounting router`.

## Root cause

The hosted evidence showed that deterministic bootstrap and one-time URL cleanup were running, because the PKCE code was removed and no nested code-bearing `returnTo` was produced. The remaining failure was caused by treating a valid `exchangeCodeForSession()` result as signed out when a redundant immediate `getUser()` validation failed or returned no user. A refresh then restored the persisted session from browser storage, which strongly indicated that the exchange had succeeded and that first-load validation was racing or otherwise rejecting the newly exchanged session.

## Architecture change

Initial session resolution now returns a typed result that distinguishes no session, existing-session restoration, PKCE exchange success, PKCE exchange error and empty PKCE exchange results. PKCE exchange errors and empty exchanges throw an `AuthBootstrapError` with a safe category instead of becoming normal signed-out state. Successful PKCE exchanges use the returned `session.user` as the primary authenticated bootstrap identity and do not immediately call `getUser()` or locally sign out when that redundant call would fail. Existing browser-storage session restoration still validates with `getUser()` and signs out locally if the restored user cannot be validated.

A safe authentication callback error page instructs the user to request a new magic link without exposing provider internals, tokens, codes or sensitive details.

## Supabase API evidence reviewed

Supabase's JavaScript reference describes `exchangeCodeForSession()` as logging in a user by exchanging an Auth Code issued during PKCE. Supabase's PKCE guide says the returned `code` can be exchanged for an access token with `exchangeCodeForSession(code)`, and the advanced guide states that the exchange returns session information containing access and refresh tokens. Based on that API contract and the hosted refresh evidence, Cooksmith now treats a successful exchanged session containing `session.user` as the callback identity while preserving RLS as the household authorisation boundary for subsequent data access.

## Files changed

- `src/application/auth/initialSession.ts`
- `src/application/auth/bootstrapAuth.ts`
- `src/app/errors/AuthCallbackError.tsx`
- `src/main.tsx`
- `tests/integration/auth-bootstrap.test.tsx`
- `docs/engineering/reports/ep003-auth-pkce-validation.md`

No database migrations, generated database types, dependencies, Supabase hosted configuration, Resend configuration or Vercel configuration changed.

## Regression tests

Added and updated Vitest coverage proving:

- PKCE exchange errors produce a safe callback failure, not `/welcome`;
- PKCE exchange with no session is categorised as `pkce_exchange_empty`;
- valid PKCE exchange authenticates immediately from the exchanged session;
- the hosted failure mode is covered: exchanged session is valid, immediate `getUser()` would fail, no local sign-out occurs and the protected route loads without refresh;
- PKCE exchange with no `session.user` is categorised as `pkce_validation_failed`;
- the PKCE code is removed from the real browser URL;
- the exchange is called exactly once;
- no nested `returnTo` is produced;
- normal signed-out startup without a PKCE code still redirects protected routes to `/welcome`;
- existing-session restoration remains authenticated when validation succeeds;
- existing restored-session validation still signs out locally when the stored user cannot be validated;
- subsequent auth state changes still update the provider.

Existing email/password, logout and onboarding tests remain in the full Vitest suite.

## Validation

- `npm ci` passed, with environment warnings for npm proxy config and local npm/node version drift from the pinned engine.
- `npm run format` passed.
- `npm run format:check` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test -- tests/integration/auth-bootstrap.test.tsx tests/integration/auth-routing.test.tsx` passed: 2 files, 11 tests.
- `npm run test -- tests/integration/onboarding.test.tsx` passed after a full-suite run showed one transient empty-body onboarding failure.
- `npm run test` initially had one transient onboarding failure, then passed on rerun: 17 files, 59 tests.
- `npm run build` passed, with the existing Vite chunk-size advisory.
- `npm run test:e2e` could not run because the Playwright Chromium executable was not installed.
- `npm run test:e2e:install` could not download Chromium because the Playwright CDN returned HTTP 403 in this environment.

## Hosted/manual validation still required

A preview deployment should be tested with a completely new magic link. Expected result:

- Magic link returns to Cooksmith.
- A session is established on the first callback load.
- No refresh is required.
- No redirect to `/welcome?returnTo=%2F` occurs for a valid magic link.
- No PKCE code remains in the address bar.
- The intended authenticated route loads.
- Refresh remains authenticated.

Hosted magic-link delivery was not manually verified locally.

## Security, privacy, production and cost confirmation

No secrets, credentials, real household data or sensitive environment files were added. No production database, hosted Supabase configuration, custom domain, Resend configuration or Vercel project setting was accessed or changed. No dependencies or paid services were added, so the cost impact is A$0 monthly and A$0 annual.

## Branch and pull request

Branch: `ep003-auth-pkce-validation`.

Commit and pull-request link are recorded in the final GitHub handover after commit and PR creation.

## Product functionality

No product behaviour outside authentication bootstrap diagnostics and valid first-load PKCE authentication changed.
