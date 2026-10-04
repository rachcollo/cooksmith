# CS-92 handover: Authentication return destinations

- **Date:** 4 October 2026
- **Branch:** `fix/cs-92-auth-return-destinations`
- **Target:** `main`
- **Baseline:** `fd0fe1b5303dcee7652794f1dcd5889c6b00897f`, verified against remote main
- **Status:** Draft PR [#184](https://github.com/rachcollo/cooksmith/pull/184) published; CI passed; hosted functional validation pending

## Outcome

Switching from password sign-in to email no longer loses an invitation or recipe destination.
The auth brand, stale confirmation actions, bootstrap error recovery and interrupted onboarding
carry the same validated application destination. Auth/onboarding and unknown return routes fall
back to Home to avoid redirect loops. A reset page that already carries a destination retains it
through missing-session recovery and successful password update.

The product benefit is fewer repeated steps after signing in. Existing household membership and
onboarding remain authoritative; redirect state never grants access.

## Scope and release

Changed auth redirect helper, auth/error/layout/onboarding components, regression tests and the
CS-92 engineering package. No database migration, Edge Function, dependency, provider or hosted
configuration change. No CS-95 Home or cross-app polish. Additional cost A$0/month and A$0/year.

The bare password-reset request URL and checked-in token-hash template are preserved. The template
appends `?token_hash`; adding a query unilaterally would break links. Carrying an intended destination
through a newly sent cross-browser reset email still requires a separately coordinated template
rollout. Current reset emails return to Home. Existing token verification and neutral request copy
are unchanged and remain covered by tests.

## Validation

- `npm ci --cache /tmp/cooksmith-npm-cache`: passed before implementation.
- `npm run preflight`: passed using the pinned package's bundled Go CLI directly in the local
  node_modules shim; the package's JS bootstrap attempts to write a read-only home directory.
- `npm run format` and `npm run validate:static`: passed; 440 tests in 71 files, lint, types and build.
- Focused auth/template/onboarding run: 38 tests in 5 files passed.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/cooksmith-browsers npm run test:e2e`: 18 passed, desktop/mobile
  Chromium including destination preservation and axe. Browser focus waits for the route heading
  before Tab rather than racing initial rendering.
- Build, database configuration (55 migrations), documentation audit and secret scan passed.
- Local Supabase full-image pull exhausted the Docker image store. Stopped; no local database
  reset, pgTAP or type generation claimed. No persistence changes in this package. An initial
  browser run hit ENOSPC during that pull; after stopping it, the full browser run passed.
- GitHub Actions at implementation SHA `3fcb098f7ba1b6bb95a68897d0d6b96f5d3a8546`: all applicable checks passed, including the full database gate, Playwright, security and PR governance. Vercel Preview build succeeded. This does not establish hosted email delivery or authenticated functional correctness.
- Publication was authorised with the repository remaining public; no visibility, workflow or security settings were changed.

## Hosted review still required

Use synthetic accounts on an approved Preview: request signup and magic links, open them in the
same and a different browser, complete onboarding, and exercise invitation acceptance after
switching auth methods. Verify password login, fresh/expired/reused reset links and password
update across mobile Safari and Chrome. Confirm hosted templates match the existing token-hash
contract, URL secrets are removed, return destinations survive supported transitions, and no
refresh or redirect loop is needed. Local mocked auth is not proof of email delivery.

## Safety and rollback

No production access/configuration change or paid evaluation. No real household data or credentials
in fixtures. Existing negative callback/redirect tests retained. React changes add no fetches,
subscriptions or dependencies. Revert the application commit to roll back; no database rollback
or hosted-template change is involved. CS-79 is authorised separately and starts from accepted main
on its own branch.
