# Milestone 5A completion report: Core household schema

## 1. Status

**Implemented, database validation pending**

All repository work and non-Docker validation are complete. This status must remain pending until isolated Supabase reset, seed, pgTAP, database lint and generated-type freshness pass in a Docker-enabled environment or GitHub Actions.

## 2. Baseline commit

- Starting branch: `v2`
- Starting commit: `de0987f42cee12638538cdd0a6e9b8e6cbf1d75f`
- Starting working tree: clean
- Milestone 4 present through merged pull request #5
- Working branch: `m05a-core-household-schema`

## 3. Summary

Milestone 5A adds Cooksmith's isolated household data structure, deterministic synthetic fixtures, schema integrity tests, generated database definitions, application domain types and Zod input validation. It introduces no UI, authentication flow, domain service, browser database access, RLS policy or later feature.

## 4. Tables created

- `cooksmith.profiles`
- `cooksmith.households`
- `cooksmith.household_members`
- `cooksmith.app_user_roles`
- `cooksmith.household_settings`
- `cooksmith.household_dietary_requirements`
- `cooksmith.household_allergies`

The migration also adds nine constrained enums and `cooksmith.set_updated_at()` with timestamp triggers on all seven mutable tables.

## 5. Constraints

Primary keys, Auth and household foreign keys, composite member-scope foreign keys, one-membership-per-household uniqueness, one-settings-row-per-household, normalised constraint uniqueness, lifecycle consistency, role restrictions, self-grant rejection and validated text, locale, servings, preparation-day and cooking-time ranges are enforced in PostgreSQL.

## 6. Indexes

Indexes cover household lifecycle, membership lookup by user or household and status, global application-role lookup, dietary/allergy household and member scope, and all non-primary audit foreign keys. Primary and unique constraints supply their own indexes.

## 7. Generated types

- Supabase database output: `src/infrastructure/database/generated/database.types.ts`
- Domain models and enum unions: `src/domain/households/types.ts`
- Zod input schemas: `src/domain/households/validationSchemas.ts`

The committed generated file is prepared from the migration structure. `npm run db:types` and the CI stale-file check remain the source of truth and must confirm it against a running local Supabase database.

## 8. Validation results

| Command                                   | Result                                         | Notes                                                     |
| ----------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- |
| `npm ci --cache /tmp/cooksmith-npm-cache` | Passed                                         | Clean exact dependency installation                       |
| `npm run format:check`                    | Passed                                         | Maintained source and documentation formatted             |
| `npm run lint`                            | Passed                                         | Zero warnings                                             |
| `npm run typecheck`                       | Passed                                         | Strict TypeScript checks                                  |
| `npm run test`                            | Passed                                         | 8 files and 30 behavioural tests                          |
| `npm run build`                           | Passed                                         | Production TypeScript and Vite build                      |
| `npm run db:config:check`                 | Passed                                         | Two v2 migrations and local-only commands validated       |
| `npm run db:prerequisites`                | Passed                                         | Pinned Node, npm and Supabase CLI available               |
| `npm run db:start`                        | Not run: Docker-compatible runtime unavailable | Requires Docker or compatible runtime                     |
| `npm run db:reset`                        | Not run: Docker-compatible runtime unavailable | Must verify migration and seed remotely                   |
| `npm run db:test`                         | Not run: Docker-compatible runtime unavailable | Must run real pgTAP remotely                              |
| `npm run db:types`                        | Not run: Docker-compatible runtime unavailable | Generated definitions prepared for remote freshness check |
| `npm run db:validate`                     | Stopped safely: Docker runtime unavailable     | Static check passed; prerequisite guard stopped runtime   |
| `npm run db:stop`                         | Not run: Docker-compatible runtime unavailable | No local services started                                 |
| `git diff --check`                        | Passed                                         | No whitespace errors                                      |
| Tracked-file secret pattern scan          | Passed                                         | No credential, private-key or service-role value found    |

## 9. Known limitations

- Database runtime validation is pending.
- RLS, grants, tenant isolation and adversarial authorisation tests are deliberately absent until Milestone 5B.
- Global role grant authorisation is not implemented. The schema only prevents direct self-grants.
- No last-owner workflow guarantee exists yet.
- No application or UI workflow consumes these structures.
- Shared deployment is unsafe until Milestone 5B passes.
- Zod 4.4.3 was promoted from a transitive development dependency to an exact direct runtime dependency for shared input validation. It adds no new package version, provider or recurring cost.

## 10. Git handover

- Branch: `m05a-core-household-schema`
- Completion commit: the commit containing this report
- Publishing status: not yet published at report creation
- Manual push: `git push -u origin m05a-core-household-schema`

## 11. Readiness for Milestone 5B

Not ready until the Docker-backed migration, seed, pgTAP and generated-type checks pass and Milestone 5A is accepted. Do not begin Milestone 5B from this branch.
