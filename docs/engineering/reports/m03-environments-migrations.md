# Milestone 3 completion report: Environment and migration discipline

## 1. Status

**Implemented, runtime validation pending**

All repository implementation and non-Docker validation are complete. Local Supabase runtime validation remains pending because this execution environment has no Docker-compatible runtime.

## 2. Baseline

- **Starting branch:** `m02-v2-application-shell`
- **Starting commit:** `06a84f6`
- **Working-tree state:** Clean before branch creation
- **Milestone branch:** `m03-environments-migrations`, created directly from the accepted Milestone 2 commit
- **Main:** Not checked out or modified

## 3. Summary

Milestone 3 establishes a repository-pinned Supabase workflow for Cooksmith v2. It adds isolated local configuration, an immutable migration path, a minimal infrastructure baseline, deterministic seeds, pgTAP conventions, generated database-type commands, safe public environment validation, preview production-project protection, database-aware CI and contributor documentation. No future household or product schema was introduced.

## 4. Supabase structure

| File                                                                       | Purpose                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `supabase/config.toml`                                                     | Local v2 project and service configuration                        |
| `supabase/migrations/20260714000100_create_v2_infrastructure_baseline.sql` | Creates the non-domain `cooksmith.infrastructure_health` baseline |
| `supabase/seed.sql`                                                        | Deterministic, repeatable infrastructure seed                     |
| `supabase/tests/0001_infrastructure_baseline.test.sql`                     | pgTAP test of schema, table, key and seed                         |
| `supabase/prototype-migrations/001_initial_schema.sql`                     | Preserved prototype history, excluded from v2 migration execution |
| `src/infrastructure/database/generated/database.types.ts`                  | Generated-type path with an explicit temporary bootstrap marker   |
| `scripts/check-database-prerequisites.mjs`                                 | Runtime and pinned-tool prerequisite checks                       |
| `scripts/check-database-config.mjs`                                        | Static local-only configuration and migration-name checks         |
| `scripts/database-types.mjs`                                               | Local generation and stale-type checking                          |

## 5. Tooling

- **Node.js:** 24.14.0
- **Package manager:** npm 11.9.0
- **Supabase CLI:** 2.109.1, exact npm development dependency
- **Docker:** Unavailable. `docker`, `podman` and local PostgreSQL executables are absent.
- **GitHub CLI:** Unavailable and not required. It was neither installed nor authenticated.

The Supabase CLI is invoked through npm scripts. A global installation is not required.

## 6. Environment model

| Environment     | Frontend                    | Supabase                     | Data                                      |
| --------------- | --------------------------- | ---------------------------- | ----------------------------------------- |
| Development     | Local Vite                  | Local Supabase               | Synthetic seeds                           |
| Preview/Staging | Vercel Preview              | One free staging project     | Synthetic or controlled test data         |
| Production      | Future v2 Vercel production | Future v2 production project | Real customer data after release approval |

Local and CI workflows use only local services. Preview must use staging, never production. Current prototype production remains untouched. Production provisioning is outside this milestone.

## 7. Migration discipline

Migrations use 14-digit timestamps, descriptive names, one coherent purpose and explicit schema qualification. They are additive by default and committed with accompanying tests and regenerated types. A migration may be corrected only while it remains local and unshared. Once applied to staging or another shared environment, its history is immutable and correction requires a compensating forward migration. Production correction follows an approved forward-fix or incident process, using expand, migrate and contract for destructive evolution.

## 8. Preview safety

`validateBuildEnv` requires an explicit `VITE_APP_ENV`, paired Supabase public variables and appropriate URL schemes. Preview builds require hosted staging values and the build-only `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` deny list. Local or Preview builds reject any matching production project reference without printing URLs or keys. Vercel context and application environment must also agree. Unit tests cover valid local configuration, missing values, context mismatch, missing deny-list configuration and production-reference rejection.

## 9. CI

The v2 quality workflow now installs the exact dependency tree, validates database configuration and runtime prerequisites, starts local Supabase, resets from migrations and seeds, runs database lint and pgTAP tests, generates local types, detects stale generated output, then runs the existing formatting, lint, type-check, application tests, production build, Playwright smoke and accessibility checks. Local services are stopped in an always-run cleanup step. No staging or production credentials are consumed.

## 10. Validation results

| Command                                   | Result                                         | Notes                                                                              |
| ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm ci`                                  | Environment retry required                     | The first run could not write the sandbox-provided `/root/.npm` cache              |
| `npm --cache /tmp/cooksmith-npm-cache ci` | Passed                                         | Clean lockfile installation using a writable sandbox cache                         |
| `npm run db:prerequisites`                | Passed                                         | Node and npm match pinned versions                                                 |
| `npm run db:config:check`                 | Passed                                         | Local project, migration names and script safety verified                          |
| `npm run format:check`                    | Passed                                         | Includes workflow syntax parsing through Prettier                                  |
| `npm run lint`                            | Passed                                         | Zero warnings                                                                      |
| `npm run typecheck`                       | Passed                                         | Strict project references passed                                                   |
| `npm run test`                            | Passed                                         | 4 files and 14 tests                                                               |
| `npm run build`                           | Passed                                         | Production build completed                                                         |
| `npm audit --audit-level=critical`        | Passed                                         | No critical dependency vulnerabilities                                             |
| Repository secret and sensitive-file scan | Passed                                         | Only safe `.env.example` matched the filename check; no credential pattern matched |
| `npm run db:start`                        | Not run: Docker-compatible runtime unavailable | Runtime validation pending                                                         |
| `npm run db:status`                       | Not run: Docker-compatible runtime unavailable | Runtime validation pending                                                         |
| `npm run db:reset`                        | Not run: Docker-compatible runtime unavailable | Fresh migration and seed validation pending                                        |
| Second `npm run db:reset`                 | Not run: Docker-compatible runtime unavailable | Repeatability validation pending                                                   |
| `npm run db:lint`                         | Not run: Docker-compatible runtime unavailable | Real database lint pending                                                         |
| `npm run db:test`                         | Not run: Docker-compatible runtime unavailable | Real pgTAP execution pending                                                       |
| `npm run db:types`                        | Not run: Docker-compatible runtime unavailable | Generated file remains an explicit bootstrap marker                                |
| `npm run db:types:check`                  | Not run: Docker-compatible runtime unavailable | Requires generated local schema output                                             |
| `npm run db:validate`                     | Not run: Docker-compatible runtime unavailable | Combined database runtime gate pending                                             |
| `npm run db:stop`                         | Not run: Docker-compatible runtime unavailable | No local services were started                                                     |

## 11. Security review

- No credentials, production identifiers or real customer data were committed.
- No production data was copied or accessed.
- No production or staging migration was run and no remote Supabase project was linked.
- No service-role key variable was added to browser configuration.
- Database scripts contain no linked, push, pull or production-project target.
- Preview fails closed when it matches a securely supplied production project reference.
- The prototype migration remains byte-for-byte preserved and inactive in the v2 migration path.

## 12. Cost impact

New recurring cost is A$0. The CLI, local runtime and GitHub-hosted validation use existing or free tooling. The documented staging posture uses one Supabase free-tier project, subject to its quotas. No cost approval is required.

## 13. Manual validation required

Run the following in a Docker-enabled environment:

```sh
docker version
docker info
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run db:types:check
npm run db:validate
npm run db:reset
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:stop
```

Commit the genuinely generated `database.types.ts` if it differs. Do not bypass the stale-type check.

## 14. Git handover

- **Local branch:** `m03-environments-migrations`
- **Local completion commit:** `98620b6`
- **Published:** No
- **Manual publishing command:** `git push -u origin m03-environments-migrations`

No remote branch or pull request is claimed.

## 15. Readiness for Milestone 4

**Ready for Milestone 4, with Milestone 3 Docker validation still pending.**

The implementation acceptance gate and all available non-Docker checks pass. This task stops at Milestone 3 and does not begin Milestone 4.
