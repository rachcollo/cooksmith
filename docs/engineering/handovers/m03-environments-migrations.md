# Milestone 3 handover: Environment and migration discipline

- **Date:** 2026-07-14
- **Branch:** `m03-environments-migrations`
- **Target:** `v2`
- **Commit:** `98620b6`
- **Pull request:** Not created. The branch was not published.
- **Status:** Implemented, runtime validation pending

## Objective

Create a safe, repeatable and isolated database development workflow for Cooksmith v2 without adding household or product domain schema.

## Product impact

- **Product Principles supported:** Save people time, reduce mental load and avoid complexity that does not remove effort.
- **User effort removed:** Contributors receive one documented command set for database setup, validation, tests and generated types.
- **Primary next action improved:** A contributor can run `npm run db:validate` to verify the local v2 database foundation.
- **Product behaviour changed:** No. The application and current production prototype behaviour are unchanged.

## Changes made

- Pinned Supabase CLI 2.109.1 as a development dependency.
- Added local-only Supabase configuration, a minimal infrastructure migration, deterministic seed and pgTAP smoke test.
- Preserved the prototype migration unchanged outside the active v2 migration path.
- Added prerequisite, configuration, database lifecycle, lint, test and generated-type scripts.
- Added validated Supabase browser configuration and a tested preview-to-production safety guard.
- Extended CI to rebuild and test the database using local isolated services.
- Documented migrations, environment separation, staging setup, troubleshooting and generated types.

## Files and components affected

| File or component                                                          | Purpose                                                    |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `supabase/config.toml`                                                     | Local v2 Supabase service configuration                    |
| `supabase/migrations/20260714000100_create_v2_infrastructure_baseline.sql` | Minimal non-domain v2 infrastructure baseline              |
| `supabase/seed.sql`                                                        | Deterministic infrastructure seed                          |
| `supabase/tests/0001_infrastructure_baseline.test.sql`                     | Real-database pgTAP smoke test                             |
| `supabase/prototype-migrations/`                                           | Preserved, inactive prototype migration history            |
| `scripts/`                                                                 | Prerequisite, configuration and generated-type checks      |
| `src/config/env.ts`                                                        | Public environment validation and production-project guard |
| `src/infrastructure/database/generated/`                                   | Generated database type location and bootstrap marker      |
| `.github/workflows/v2-quality.yml`                                         | Isolated database validation in CI                         |
| `docs/engineering/v2/`                                                     | Database workflow, staging and environment guidance        |

## Migrations

Apply `20260714000100_create_v2_infrastructure_baseline.sql` through `npm run db:reset`. It creates only the explicitly qualified `cooksmith` schema and `cooksmith.infrastructure_health` infrastructure object. It adds no household or product domain tables.

## Setup instructions

1. Use Node.js 24.14.0 and npm 11.9.0.
2. Install Docker Desktop or another Docker-compatible runtime and start its daemon.
3. Run `npm ci`.
4. Run `npm run db:start`.
5. Run `npm run db:validate`.
6. Run `npm run db:stop` when finished.

## Tests run

| Command or check                   | Result  | Notes                                                       |
| ---------------------------------- | ------- | ----------------------------------------------------------- |
| `npm run db:config:check`          | Passed  | Local-only configuration and script safety checks passed    |
| `npm run db:prerequisites`         | Passed  | Pinned Node and npm versions detected                       |
| `npm run lint`                     | Passed  | Zero warnings                                               |
| `npm run typecheck`                | Passed  | Strict project references passed                            |
| `npm run test`                     | Passed  | 4 files and 14 tests, including environment safety          |
| `npm run build`                    | Passed  | Production application build completed                      |
| Docker-dependent database commands | Not run | No Docker-compatible runtime is installed in this workspace |

The completion report records the final clean-install validation results.

## Preview or verification instructions

Configure Preview with `VITE_APP_ENV=preview`, staging `VITE_SUPABASE_URL`, its publishable key and the server/build-only `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` deny list. Then run `npm run build`. A preview configured with a denied production project reference fails closed.

## Accessibility, security, privacy and cost

- **Accessibility:** No interface behaviour changed. Existing accessible shell checks remain in CI.
- **Security and privacy:** Scripts target local services only. No service-role key is accepted by browser configuration. Preview and local environments cannot silently use a configured production project.
- **Cost impact:** A$0 monthly and annually. Local tooling and CI are free; a future staging project is documented for the Supabase free tier.
- **Credential check:** Repository content was checked for sensitive environment files and credential patterns. No credential was committed.

## Known limitations

- Docker-dependent reset, migration, seed, pgTAP, lint and type-generation checks could not run in this workspace.
- The committed generated type file is an explicit bootstrap marker until local generation is run. CI and `db:types:check` detect this pending update.
- A staging Supabase project and Vercel Preview values require manual owner configuration.

## Deferred work

- Profiles, households, memberships, application roles, settings and business RLS policies.
- Production Supabase provisioning or data migration.
- Authentication and all product feature domains.

## Rollback approach

Revert the Milestone 3 commits on `v2`. No production database migration was run. Before a shared environment uses the migration, local-only corrections may edit it and reset local state. After shared use, corrections require a new forward migration.

## Recommended next milestone

The repository is ready for Milestone 4, with Milestone 3 Docker validation still pending. Do not begin Milestone 4 until this implementation is accepted and the runtime validation is completed or explicitly accepted as pending.

## Completion report

See the [Milestone 3 completion report](../reports/m03-environments-migrations.md).
