# Milestone 5A handover: Core household schema

## Objective

Create the structural household data foundation without pulling forward RLS, authentication or product workflows.

## Changes made

- Added the core household migration, constraints, indexes and shared timestamp trigger.
- Added deterministic synthetic Auth identities, two households, memberships, settings and explicit constraint examples.
- Added generated database definitions, application domain models and Zod input validation.
- Added schema-level pgTAP checks and TypeScript validation tests.
- Documented the model, extension boundary and shared-deployment restriction.

## Files and components affected

- `supabase/migrations/20260714060000_create_core_household_schema.sql`
- `supabase/seed.sql`
- `supabase/tests/0002_core_household_schema.test.sql`
- `src/infrastructure/database/generated/database.types.ts`
- `src/domain/households/types.ts`
- `src/domain/households/validationSchemas.ts`
- `tests/unit/householdSchemas.test.ts`
- Milestone documentation and repository indexes

No application route or interface component changed.

## Migrations

One additive migration creates nine enums, seven domain tables, one trigger function, seven timestamp triggers, constraints and indexes inside the existing isolated `cooksmith` schema. Prototype migrations and tables are untouched.

## Setup instructions

```bash
npm ci
npm run db:start
npm run db:reset
```

Use a local v2 Supabase instance only. Do not link to production.

## Tests run

See the [completion report](../reports/m05a-core-household-schema.md) for recorded results. Local application checks are mandatory. Docker-backed reset, pgTAP and generated-type freshness are mandatory before this status can become Complete.

## Preview or verification instructions

This milestone has no user-facing preview. Verify through `npm run db:validate`, `npm run test` and the GitHub Actions v2 quality job. Inspect only synthetic rows after a local reset.

## Known limitations

- No RLS or browser grants exist by design.
- No household application service, authentication flow or UI exists.
- The schema must not enter a shared environment before Milestone 5B security work passes.

## Deferred work

Milestone 5B adds reusable authorisation helpers, default-deny RLS, grants and real policy tests. Milestone 5C completes the broader tenant-isolation and API-contract framework defined by the approved split.

## Rollback approach

Reset the isolated local database if the migration has not been shared. Once shared, preserve immutable migration history and use a reviewed forward-fix. Never apply a destructive rollback to the prototype or production database.

## Recommended next milestone

Milestone 5B, only after this branch is accepted and the database validation gate passes.
