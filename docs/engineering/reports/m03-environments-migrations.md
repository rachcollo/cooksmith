# Milestone 3 completion report: Environment and migration discipline

## 1. Status

**Complete**

The complete Milestone 3 validation gate passed in GitHub Actions using isolated local Supabase services. No Docker installation is required on a contributor's device when using the approved remote CI workflow.

## 2. Baseline

- **Remote baseline branch:** `v2`
- **Remote baseline commit:** `55769ff`
- **Milestone branch:** `m03-environments-migrations-clean`
- **Pull request:** [#4](https://github.com/rachcollo/cooksmith/pull/4), targeting `v2`
- **Main:** Unchanged

The clean remote branch replaced a superseded incorrectly based branch. It contains no macOS metadata files.

## 3. Summary

Milestone 3 establishes a repository-pinned Supabase workflow for Cooksmith v2. It adds isolated local configuration, immutable migration discipline, a minimal infrastructure baseline, deterministic seeds, pgTAP tests, generated database types, safe public environment validation, preview production-project protection, database-aware CI and contributor documentation. No household or product domain schema was introduced.

## 4. Supabase structure

| File                                                                       | Purpose                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/config.toml`                                                     | Local v2 project and service configuration                      |
| `supabase/migrations/20260714000100_create_v2_infrastructure_baseline.sql` | Non-domain `cooksmith.infrastructure_health` baseline           |
| `supabase/seed.sql`                                                        | Deterministic infrastructure seed                               |
| `supabase/tests/0001_infrastructure_baseline.test.sql`                     | pgTAP schema, table, key and seed tests                         |
| `supabase/prototype-migrations/001_initial_schema.sql`                     | Preserved prototype history outside v2 execution                |
| `src/infrastructure/database/generated/database.types.ts`                  | Generated and current local-schema types                        |
| `scripts/check-database-prerequisites.mjs`                                 | Runtime and pinned-tool checks                                  |
| `scripts/check-database-config.mjs`                                        | Local-only configuration checks                                 |
| `scripts/database-types.mjs`                                               | Local generation, repository formatting and stale-type checking |

## 5. Tooling

- **Node.js:** 24.14.0
- **Package manager:** npm 11.9.0
- **Supabase CLI:** 2.109.1, exact npm development dependency
- **Database runtime:** Docker-compatible GitHub-hosted runner
- **Local Docker:** Optional for contributors who prefer local database work
- **GitHub CLI:** Not required for the remote-first workflow

## 6. Environment model

| Environment     | Frontend                         | Supabase                     | Data                              |
| --------------- | -------------------------------- | ---------------------------- | --------------------------------- |
| Development     | Local Vite or remote branch work | Local Supabase               | Synthetic seeds                   |
| Preview/Staging | Vercel Preview                   | One free staging project     | Synthetic or controlled test data |
| Production      | Future v2 Vercel production      | Future v2 production project | Real customer data after approval |

CI uses isolated local services. Preview must use staging and never production. The current prototype production environment remains untouched.

## 7. Migration discipline

Migrations use 14-digit timestamps, descriptive names, one coherent purpose and explicit schema qualification. They are additive by default. Local-only migrations may be corrected before sharing. Once applied to staging or another shared environment, history is immutable and corrections require a forward migration. Production correction follows an approved forward-fix or incident process.

## 8. Preview safety

`validateBuildEnv` requires explicit environments, paired Supabase public variables and valid URL schemes. Preview builds require hosted staging values and the build-only `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` deny list. Non-production builds reject configured production project references without logging URLs or keys. Unit tests cover valid configuration and all safety failures.

Vercel Preview remains pending account-level staging environment configuration. The current Vercel failures are safe, expected failures caused by missing staging values.

## 9. CI

GitHub Actions installs pinned dependencies, validates database configuration, starts isolated Supabase, rebuilds from migrations and seeds, runs database lint and pgTAP, generates and verifies formatted database types, runs formatting, lint, TypeScript, application tests, production build, Playwright smoke tests and accessibility checks, then stops local services.

## 10. Validation results

| Command or check                          | Result | Notes                                 |
| ----------------------------------------- | ------ | ------------------------------------- |
| `npm ci`                                  | Passed | Clean GitHub-hosted installation      |
| `npm run db:config:check`                 | Passed | Local-only configuration verified     |
| `npm run db:start`                        | Passed | Isolated Supabase started remotely    |
| `npm run db:reset`                        | Passed | Fresh migration and seed applied      |
| `npm run db:lint`                         | Passed | Database lint completed               |
| `npm run db:test`                         | Passed | 1 file and 4 pgTAP checks             |
| `npm run db:types`                        | Passed | Types generated and formatted         |
| Generated type freshness                  | Passed | Committed output matches local schema |
| `npm run format:check`                    | Passed | Repository formatting current         |
| `npm run lint`                            | Passed | Zero warnings                         |
| `npm run typecheck`                       | Passed | Strict TypeScript checks              |
| `npm run test`                            | Passed | 4 files and 14 tests                  |
| `npm run build`                           | Passed | Production build completed            |
| Playwright smoke and accessibility checks | Passed | Browser validation completed          |
| `npm run db:stop`                         | Passed | Isolated services stopped             |
| Secret and sensitive-file checks          | Passed | No credential material found          |

Validation evidence: GitHub Actions `v2 quality` run 9 on PR #4.

## 11. Security review

- No credentials, production identifiers or real customer data were committed.
- No production data was accessed.
- No production or staging migration was run.
- No remote Supabase project was linked.
- No service-role key enters browser configuration.
- Database scripts contain no hosted push, pull or production target.
- Preview fails closed until safe staging values are configured.
- The prototype migration remains byte-for-byte preserved and inactive in v2.

## 12. Cost impact

New recurring cost is A$0. GitHub Actions and the documented future Supabase staging project use existing or free-tier capacity. No cost approval is required.

## 13. Remote-first validation

Routine validation runs through GitHub Actions after each branch update. Contributors do not need Docker locally. Local database commands remain available for developers who choose to install a Docker-compatible runtime.

## 14. Git handover

- **Remote branch:** `m03-environments-migrations-clean`
- **Validated commit:** `262a434`
- **Published:** Yes
- **Pull request:** [#4](https://github.com/rachcollo/cooksmith/pull/4)
- **Target:** `v2`

## 15. Readiness for Milestone 4

**Ready for Milestone 4.**

Every Milestone 3 runtime and application validation check passes remotely. Vercel staging values remain a manual preview setup item and do not weaken the completed migration or safety foundation. This task does not begin Milestone 4.
