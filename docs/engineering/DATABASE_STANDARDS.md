# Database standards

These rules apply to PostgreSQL, Supabase, Auth, RLS, database functions, generated types, seeds and database-facing application code. Follow the existing [database workflow](v2/database-workflow.md), [household schema](v2/core-household-schema.md) and [authorisation policy](v2/authorisation-and-row-level-security.md).

## Environment and production protection

For packages containing Supabase migrations, also follow the protected Production release discipline in [Codex build rules](CODEX_BUILD_RULES.md) and the [Production database release runbook](v2/production-database-releases.md).

- Local, Preview and Production are separate environments with separate credentials and data.
- Normal development and CI use the isolated local Supabase project. Do not link scripts to a hosted project.
- Preview may use only approved staging resources and preview-scoped public values.
- Production migrations require an explicit release task, approved deployment plan, backup/forward-fix plan and production authority.
- Never run reset, seed, destructive SQL, generated-type tooling or experiments against Production.
- Never expose a service-role or secret key to browser code, source control, logs or test artifacts.

## Migrations

- Create migrations through the repository Supabase command and name them `YYYYMMDDHHMMSS_short_descriptive_name.sql`.
- Give each migration one coherent purpose and wrap it in a transaction unless PostgreSQL forbids that operation.
- Qualify every application object with the `cooksmith` schema. Use explicit names for constraints, indexes, triggers, functions and policies.
- Prefer additive, backwards-compatible expand, migrate, contract changes.
- A migration may be corrected only while it is local and unshared. Reset and rerun full database validation afterwards.
- Once a migration reaches any shared environment, it is immutable. Add a timestamped compensating forward-fix instead of editing, renaming or deleting history.
- Destructive work requires separate approval, backup confirmation, compatibility analysis and a tested recovery plan.

## Schema integrity and performance

- Use server-generated UUID primary keys unless the authoritative model requires another stable key.
- Mutable rows use `created_at` and `updated_at` as non-null `timestamptz`; add `created_by` and `updated_by` where provenance matters.
- Enforce invariant data with named `not null`, `check`, unique and exclusion constraints rather than UI assumptions.
- Define foreign keys with deliberate update/delete behaviour. Prevent cross-household references with composite keys where applicable.
- Index foreign keys, tenant predicates, lifecycle filters and measured query paths. Do not duplicate indexes supplied by primary or unique constraints.
- Store dates, quantities, units and constrained values structurally.

## Functions and secure search paths

- Prefer `security invoker` functions.
- Every function and trigger function sets an explicit `search_path`; security-sensitive functions use an empty path and fully qualified objects.
- Use `security definer` only when a documented requirement, such as avoiding RLS recursion, cannot be met safely with invoker rights.
- Security-definer functions must live outside exposed schemas, derive the caller from `auth.uid()`, accept no caller-supplied user identity, fully qualify every object and have `PUBLIC` execution revoked.
- Grant execute only to the minimum required roles and add abuse-case tests.
- Never use security definer merely to bypass a permission error.

## RLS and authorisation

- Enable RLS on every private table in the migration that creates or exposes it.
- Default deny: no policy means no browser access. Grant only operations supported by explicit policies.
- Use `to authenticated` plus ownership or active-membership predicates. Authentication alone is not authorisation.
- Every update policy requires both `using` and `with check`.
- Reuse hardened membership and role helpers. Do not duplicate or weaken household checks.
- Household roles and global application roles are separate. Application roles never silently bypass household membership.
- Do not use email addresses, frontend state, `raw_user_meta_data` or stale JWT claims as authorisation sources.
- Views over private data use `security_invoker` where supported or remain unexposed with explicit revoked privileges.

## Types, seeds and fixtures

- Regenerate `src/infrastructure/database/generated/database.types.ts` from the isolated local database after every schema or function change.
- Generated database types are build artifacts, not domain models. Do not hand-edit them as a substitute for generation.
- `supabase/seed.sql` and test fixtures contain only deterministic synthetic data. No real emails, household data, access tokens or production identifiers.
- Seeds must be safe to repeat after a local reset and must never target Production.

## Future private-table checklist

Every future private table requires:

1. A timestamped migration.
2. Named constraints for every invariant.
3. Deliberate indexes for foreign keys and access predicates.
4. RLS enabled before exposure.
5. Explicit policies for each allowed operation, leaving all others denied.
6. Owner, member, unrelated-user and inactive-user tests.
7. Identifier-manipulation and cross-household tests.
8. Refreshed generated database types.
9. An updated policy matrix.
10. CI coverage using real PostgreSQL policy execution.

Before review, run reset, database lint, pgTAP, generated-type freshness and the application quality suite. If Docker is unavailable locally, complete every non-Docker check and require the unchanged GitHub Actions database gate.
