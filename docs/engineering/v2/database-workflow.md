# Cooksmith v2 database workflow

## Purpose

Milestone 3 establishes a local-first Supabase workflow without connecting to Production. The active v2 project is in `supabase/`. The preserved MVP SQL is in `supabase/prototype-migrations/` and is never read by v2 reset commands.

## Supported tools

- Node.js 24.14.0
- npm 11.9.0
- Supabase CLI 2.109.1, installed as an exact development dependency
- Docker Desktop or a Docker-compatible runtime with a running daemon

No global Supabase installation, GitHub CLI, Supabase login or hosted credential is required for normal local or CI validation. The Supabase CLI requires Node.js 20 or later and uses Docker-compatible containers for its local stack.

## First setup

```bash
npm ci
npm run db:prerequisites
npm run db:start
npm run db:status
npm run db:reset
```

Copy `.env.example` to `.env.local`. Obtain the local project URL and publishable key from `npm run db:status`. Never copy the local secret or service-role value into a `VITE_` variable.

Stop the stack when it is no longer needed:

```bash
npm run db:stop
```

## Commands

| Command                                  | Purpose                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `npm run db:prerequisites`               | Check pinned Node.js and npm versions without requiring Docker                     |
| `npm run db:prerequisites:runtime`       | Also verify that the Docker daemon is available                                    |
| `npm run db:config:check`                | Validate local project identity, required files, migration names and script safety |
| `npm run db:start`                       | Start the repository-pinned local Supabase stack                                   |
| `npm run db:status`                      | Show local service status and local-only connection details                        |
| `npm run db:stop`                        | Stop this local Supabase project                                                   |
| `npm run db:reset`                       | Rebuild local Postgres from migrations and `seed.sql`                              |
| `npm run db:lint`                        | Lint the local `cooksmith` schema and fail on database errors                      |
| `npm run db:test`                        | Run pgTAP files from `supabase/tests` against local Postgres                       |
| `npm run db:types`                       | Generate TypeScript definitions from the local `cooksmith` schema                  |
| `npm run db:types:check`                 | Fail when committed generated types differ from local schema output                |
| `npm run db:migration:new -- short_name` | Create a timestamped migration skeleton                                            |
| `npm run db:validate`                    | Reset, lint, test and check generated types against local Supabase                 |

All database scripts are local-only. They intentionally omit `--linked`, project references, database URLs and remote push commands.

## Migration rules

1. Name migrations `YYYYMMDDHHMMSS_short_descriptive_name.sql`.
2. Give each migration one coherent purpose and commit it with its related tests and types.
3. Qualify every application object with the `cooksmith` schema.
4. Use explicit, stable names for constraints, indexes, policies and triggers.
5. Prefer additive, backwards-compatible changes and expand, migrate, contract sequencing.
6. Wrap coherent migrations in a transaction unless a PostgreSQL operation explicitly cannot run in one.
7. Index foreign keys and frequent authorisation predicates deliberately.
8. Treat seeds as synthetic, deterministic and safe to repeat after reset.
9. Run reset, lint, pgTAP, type generation and the application quality baseline before review.
10. Destructive migrations require backup confirmation, separate approval and a documented forward-fix or recovery plan.

### Correcting a local-only migration

A migration may be edited before it has been applied to any shared environment. Reset local state afterwards and rerun the complete database validation. Confirm with the team that no one else has consumed it.

### Correcting a shared migration

Once a migration has reached staging or any shared database, never edit or rename it. Add a timestamped compensating forward migration and tests.

### Correcting Production

Use an approved forward-fix or incident recovery plan. Do not improvise a destructive rollback or edit migration history. Production migration is outside Milestone 3.

## Seeds and tests

`supabase/seed.sql` contains only one infrastructure marker. It has no users, emails, production identifiers, credentials or product-domain records.

Database tests use pgTAP and are named `NNNN_description.test.sql`. Each test runs transactionally. Milestone 3 proves the v2 schema, infrastructure table and seed marker. Tenant and RLS tests begin with the schema milestone that owns those policies.

## Generated types

Generated output belongs at `src/infrastructure/database/generated/database.types.ts`. Run generation only against local Supabase:

```bash
npm run db:types
npm run db:types:check
```

Do not edit row, insert or update definitions manually. The Milestone 3 bootstrap placeholder must be replaced by a Docker-enabled generation run before the milestone can be marked fully complete.

## CI

The `v2 quality` workflow uses GitHub's Docker-enabled runner. It installs from the lockfile, validates configuration, starts local Supabase, resets from migrations and seed, lints, runs pgTAP, regenerates types, checks for a committed diff, then retains all formatting, lint, type, Vitest, build, Playwright and axe checks from Milestone 2. No hosted Supabase or repository secret is used.

## Troubleshooting

### Docker is not installed or the daemon is not running

`db:prerequisites:runtime` exits with a concise fix. Install or start Docker Desktop or another Docker-compatible runtime, verify `docker info`, then retry. The script never attempts system-level installation.

### Supabase tries to use a global installation

Run commands through `npm run`. npm places the pinned `node_modules/.bin/supabase` executable first on the command path.

### Ports are already in use

Stop another local Supabase project or service using ports 54320 to 54324, then retry. Do not point this project at a hosted database as a workaround.

### Generated types are stale

Start local Supabase, reset the database, run `npm run db:types`, review the generated change and commit it with the migration.

## Known limitations

- Docker-dependent validation was unavailable during Milestone 3 implementation.
- The staging and future v2 Production projects are not provisioned by repository code.
- Product tables, authentication flows and business RLS policies are intentionally absent.
