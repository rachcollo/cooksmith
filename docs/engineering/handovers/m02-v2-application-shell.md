# Milestone 2 handover: v2 application shell and quality baseline

## Objective

Create a clean, independently deployable v2 application foundation without implementing product capabilities owned by later milestones.

## Changes made

- Replaced the prototype source on the v2 branch with a small React and TypeScript shell.
- Added base routing, layout, navigation, loading, error, not-found and health states.
- Added responsive, accessible UI tokens and essential primitives.
- Established presentation, application, domain, infrastructure, configuration and test boundaries.
- Pinned the runtime, package manager and dependencies with a reproducible lockfile.
- Added environment validation, structured redacting logs and correlation identifiers.
- Added ESLint, Prettier, TypeScript, Vitest, Testing Library, Playwright and axe checks.
- Added pull-request CI and independent Vercel preview configuration.
- Rewrote developer setup, testing, structure, dependency and preview documentation.

No household, authentication, pantry, recipe, planning, shopping-list, AI or database behaviour was added.

## Files and components affected

- Application source: `src/app`, `src/routes`, `src/components/ui`, `src/config`, `src/infrastructure`, `src/shared`, `src/styles`
- Boundary notes: `src/application/README.md`, `src/domain/README.md`
- Tests: `tests/unit`, `tests/integration`, `tests/e2e`, `tests/renderApp.tsx`, `tests/setup.ts`
- Tooling: `package.json`, `package-lock.json`, TypeScript, Vite, Vitest, Playwright, ESLint and Prettier configuration
- Delivery: `.github/workflows/v2-quality.yml`, `vercel.json`, `.env.example`, `.nvmrc`
- Documentation: root `README.md` and `docs/engineering/v2`

The former prototype modules are removed only from the v2 branch. They remain unchanged on `main`.

## Migrations

None. No database or Supabase connection is part of this milestone.

## Setup instructions

1. Use Node.js 24.14.0 and npm 11.9.0.
2. Run `npm ci`.
3. Optionally copy `.env.example` to `.env.local`.
4. Run `npm run dev`.

## Tests run

- `npm ci`: passed from the committed lockfile.
- `npm run format:check`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run typecheck`: passed.
- `npm run test`: passed, 4 files and 8 tests.
- `npm run build`: passed.
- Static health asset and unknown-route production preview checks: passed.
- `npm run test:e2e:install`: could not download Chromium in this restricted workspace. The matching-browser install and smoke suite remain required in GitHub Actions.
- `npm audit --audit-level=critical`: passed with zero vulnerabilities.

## Preview or verification instructions

1. Build with `npm run build`.
2. Run `npm run test:e2e` to start and test the production preview automatically.
3. Verify `/`, `/health`, `/health.json` and an unknown route.
4. For Vercel, keep `main` as the production branch and configure `VITE_APP_ENV=preview` only for previews.

## Known limitations

- Vercel Git integration and preview environment values require repository-owner configuration and cannot be proved solely from source.
- The Playwright suite could not run locally because this workspace returned an invalid zero-byte browser archive. CI installs the pinned browser in an unrestricted GitHub runner.
- Structured console logging is the approved no-cost baseline. No hosted observability service is connected.
- The shell contains no authenticated routes or product workflows by design.
- Supabase and server-only environment validation are deferred until their approved roadmap milestone.

## Deferred work

- Authentication, household and profile data.
- Expanded navigation and product-specific UI patterns.
- Supabase environment and migration workflows.
- Product domains including pantry, recipes, planning and shopping lists.
- Hosted observability, only if a measured need and cost approval justify it.

## Rollback approach

Revert the Milestone 2 merge commit on `v2`. The production prototype on `main` is independent and does not need a database rollback.

## Recommended next milestone

Proceed only to the next milestone in the approved roadmap after this foundation is reviewed, its preview is verified and explicit approval is given.

## Completion report

See the [Milestone 2 completion report](../reports/m02-v2-application-shell.md) for the repository assessment, reuse decisions, architecture, dependency and validation details.
