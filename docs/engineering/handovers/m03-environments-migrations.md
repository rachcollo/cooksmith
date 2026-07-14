# Milestone 3 handover: Environment and migration discipline

- **Date:** 2026-07-14
- **Branch:** `m03-environments-migrations-clean`
- **Target:** `v2`
- **Validated commit:** `262a434`
- **Pull request:** [#4](https://github.com/rachcollo/cooksmith/pull/4)
- **Status:** Complete

## Objective

Create a safe, repeatable and isolated database development workflow for Cooksmith v2 without adding household or product domain schema.

## Product impact

- **Product Principles supported:** Save people time, reduce mental load and avoid unnecessary complexity.
- **User effort removed:** Contributors receive one remote validation workflow for database setup, migrations, tests and generated types.
- **Primary next action improved:** Push a branch and let GitHub Actions validate the complete v2 database foundation.
- **Product behaviour changed:** No. The application and production prototype behaviour are unchanged.

## Changes made

- Pinned Supabase CLI 2.109.1.
- Added local-only Supabase configuration, minimal infrastructure migration, deterministic seed and pgTAP tests.
- Preserved the prototype migration outside active v2 migrations.
- Added database lifecycle, lint, test and formatted generated-type scripts.
- Added validated Supabase browser configuration and preview-to-production protection.
- Extended CI to rebuild and test the isolated database remotely.
- Added `.DS_Store` protection.
- Documented migrations, environments, staging and troubleshooting.

## Files and components affected

| File or component                                                          | Purpose                                               |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| `supabase/config.toml`                                                     | Local v2 Supabase configuration                       |
| `supabase/migrations/20260714000100_create_v2_infrastructure_baseline.sql` | Minimal non-domain baseline                           |
| `supabase/seed.sql`                                                        | Deterministic infrastructure seed                     |
| `supabase/tests/0001_infrastructure_baseline.test.sql`                     | Real-database pgTAP tests                             |
| `supabase/prototype-migrations/`                                           | Preserved inactive prototype history                  |
| `scripts/`                                                                 | Prerequisite, configuration and generated-type checks |
| `src/config/env.ts`                                                        | Public environment validation and production guard    |
| `src/infrastructure/database/generated/`                                   | Current generated database types                      |
| `.github/workflows/v2-quality.yml`                                         | Complete remote validation                            |
| `docs/engineering/v2/`                                                     | Workflow, staging and environment guidance            |

## Migrations

`20260714000100_create_v2_infrastructure_baseline.sql` creates only the qualified `cooksmith` schema and `cooksmith.infrastructure_health` infrastructure object. It adds no household or product domain tables. The migration and deterministic seed passed a fresh remote reset.

## Setup instructions

Routine contributors need only Node.js 24.14.0, npm 11.9.0 and GitHub access. Push a branch or update the PR to trigger the complete remote validation workflow. Docker is optional and only required for developers who choose to run Supabase locally.

## Tests run

| Command or check                   | Result | Notes                          |
| ---------------------------------- | ------ | ------------------------------ |
| Clean dependency install           | Passed | GitHub-hosted runner           |
| Supabase start and reset           | Passed | Isolated remote Docker runtime |
| Database lint                      | Passed | Local schema                   |
| pgTAP database tests               | Passed | 1 file and 4 tests             |
| Type generation and freshness      | Passed | Generated output committed     |
| Formatting and lint                | Passed | Zero warnings                  |
| TypeScript                         | Passed | Strict checks                  |
| Application tests                  | Passed | 4 files and 14 tests           |
| Production build                   | Passed | Vite production output         |
| Playwright and accessibility smoke | Passed | Browser checks                 |
| Supabase cleanup                   | Passed | Services stopped               |

## Preview or verification instructions

GitHub Actions requires no staging or production credential. For Vercel Preview, configure `VITE_APP_ENV=preview`, staging `VITE_SUPABASE_URL`, its publishable key and the build-only `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` deny list. Missing values fail safely.

## Accessibility, security, privacy and cost

- **Accessibility:** No interface behaviour changed. Existing shell checks passed.
- **Security and privacy:** No production link, data or credential was used. No service-role key enters browser configuration.
- **Cost impact:** A$0 recurring cost.
- **Credential check:** No credential or sensitive environment file was committed.

## Known limitations

- Vercel Preview awaits account-level staging environment values.
- Two Vercel projects are connected; the production prototype project should remain limited to `main`, with the dedicated v2 project used for v2 previews.
- Production Supabase provisioning remains outside this milestone.

## Deferred work

Profiles, households, memberships, application roles, settings, authentication and every product feature domain remain deferred to their approved roadmap milestones.

## Rollback approach

Revert the Milestone 3 commits on `v2`. No production database migration was run. Shared migration corrections must use a forward migration.

## Recommended next milestone

Milestone 3 is complete and the repository is ready for Milestone 4 after PR #4 is reviewed and merged into `v2`.

## Completion report

See the [Milestone 3 completion report](../reports/m03-environments-migrations.md).
