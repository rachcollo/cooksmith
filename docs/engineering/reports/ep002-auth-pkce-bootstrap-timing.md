# EP002 deterministic authentication bootstrap report

## Status

Implemented with automated application checks passing. Hosted magic-link verification remains required on a preview deployment.

## Baseline

Branch: `ep002-auth-pkce-bootstrap-timing`.

Baseline commit inspected before implementation: `5feca8d fix(auth): initialise provider from bootstrap state`.

## Root cause

The Supabase PKCE code exchange and session restoration were still started from React render/effect timing inside the provider tree. That allowed the router and protected route guards to mount before initial authentication state was settled, so a transient null auth state could send the user to `/welcome` with the PKCE code nested inside `returnTo`.

## Architecture change

Application startup now loads public configuration, creates the Supabase client once, resolves the PKCE code or existing session, validates the authenticated user, removes the one-time code from the browser URL, and only then mounts Cooksmith providers and the router. `AuthProvider` now initialises from the resolved bootstrap state and listens only for subsequent auth events, ignoring Supabase's post-bootstrap `INITIAL_SESSION` notification.

## Files changed

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/providers/AppProviders.tsx`
- `src/app/auth/AuthProvider.tsx`
- `tests/renderApp.tsx`
- `tests/integration/auth-routing.test.tsx`
- `tests/integration/auth-bootstrap.test.tsx`
- `docs/engineering/reports/ep002-auth-pkce-bootstrap-timing.md`

No database migrations, generated database types, dependencies, Supabase hosted configuration, Resend configuration or Vercel configuration changed.

## Regression tests

Added and updated Vitest coverage proving:

- the router is not mounted while a delayed PKCE exchange is unresolved;
- an initial null auth event does not redirect the authenticated PKCE flow to `/welcome`;
- `exchangeCodeForSession()` is called exactly once;
- the PKCE code is removed from the real browser URL;
- nested `/welcome?returnTo=...returnTo...` redirects are not produced;
- the authenticated protected route loads after bootstrap;
- existing signed-out protected routing still redirects to `/welcome`;
- existing-session restoration works without a PKCE code;
- invalid restored users are signed out locally;
- subsequent auth state changes still update the provider.

Existing email/password, logout and onboarding tests remain in the full Vitest suite.

## Validation

- `npm ci` passed, with existing environment warnings for npm proxy config and local npm/node version drift from the pinned engine.
- `npm run format` passed.
- `npm run format:check` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
- `npm run test` passed: 17 files, 55 tests.
- `npm run build` passed, with the existing Vite chunk-size advisory.
- `npm run test:e2e` could not run because the Playwright Chromium executable was not installed.
- `npm run test:e2e:install` could not download Chromium because the Playwright CDN returned HTTP 403 in this environment.

## Hosted/manual validation still required

A preview deployment should be tested with a completely new magic link. Expected result:

- Magic link returns to Cooksmith.
- A session is established.
- No redirect to `/welcome?returnTo=...code...` occurs.
- No PKCE code remains in the address bar.
- The intended authenticated route loads.
- Refresh remains authenticated.

Hosted magic-link delivery was not manually verified locally.

## Security, privacy, production and cost confirmation

No secrets, credentials, real household data or sensitive environment files were added. No production database, hosted Supabase configuration, custom domain, Resend configuration or Vercel project setting was accessed or changed. No dependencies or paid services were added, so the cost impact is A$0 monthly and A$0 annual.

## Branch and pull request

Branch: `ep002-auth-pkce-bootstrap-timing`.

Commit and pull-request link are recorded in the final GitHub handover after commit and PR creation.

## Product functionality

No product behaviour outside deterministic authentication startup changed.
