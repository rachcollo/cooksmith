# CS-79 handover: Shared purchasing ingredient identity

- Date: 4 October 2026
- Branch: `feat/cs-79-shopping-ingredient-normalisation`
- Base: `main` at `fd0fe1b5303dcee7652794f1dcd5889c6b00897f`
- Status: Implementation review; hosted release not performed
- Engineering package: [CS-79](../../../engineering/ready/cs79-shopping-ingredient-normalisation.md)
- Durable contract: [proposed ADR 014](../../architecture/decisions/014-purchasing-ingredient-identity.md)

## Outcome and scope

One diced onion, two sliced onions and one chopped onion generate four onions. Compatible metric amounts sum; cups, counts and weights remain separate. Recipe amounts remain visible for review. Manual shopping items are not silently merged. Equivalent meal regeneration retains generated row identity and bought state; editing or deleting a meal changes only its contribution.

Pantry add/edit and shopping matching use the same conservative product identity. Existing Pantry aliases remain intact behind an explicit review disclosure showing location, amount and availability. Add rejects new aliases with a clear message. A household may edit or remove a record using the existing controls; nothing is combined automatically. Original recipe and Get Ahead preparation data are untouched.

## Database and release

One new migration: `20261004104415_shopping_ingredient_identity.sql`. No Edge Functions or dependencies changed. No provider calls or paid evaluations. Cost: A$0/month and A$0/year.

The migration backfills generated shopping rows from per-meal contributions, preserves raw amounts, splits incompatible units and preserves all-bought state. It preserves manual rows and Pantry data. Generated shopping IDs can change during this one-time backfill. Composite foreign keys enforce household alignment in addition to existing RLS. Advisory locks serialize reconciliation and canonical Pantry insertion. Starter population remains idempotent.

Release must apply the migration before the new application selects contribution provenance. Before any approved release, require exact-SHA CI, database backup and migration dry run, then authenticated household and shopping verification. No remote migration or deployment has been performed. The PR does not deploy Production. After separately approved merge, use the protected **Production database release** workflow against the exact approved `main` SHA, with mandatory dry run and migration-history verification. Released migrations are immutable; fixes require new forward migrations. Revert application only to a compatible consumer; forward-fix any released migration.

## Validation evidence

Local full Supabase Docker image expansion exceeded the environment's disk capacity. A smaller isolated PostgreSQL 17 container with real Supabase Auth v2.192.0 migrations, pgTAP and synthetic seed data was used instead. All baseline migrations plus this migration applied. This is real PostgreSQL/RLS evidence, but is not described as a successful full `supabase start`.

- Existing database suite: 429 checks passed after fixing starter-population compatibility.
- New database identity/provenance/reconciliation/RLS/Pantry tests: 16 checks passed.
- Migration upgrade fixture: five checks passed, covering aliases, mixed units, manual row preservation, raw contributions and existing Pantry aliases.
- Generated database types came from the pinned Supabase CLI against this local database; no hand editing.
- `npm run validate:static`: passed, including format, lint, types, 458 tests in 72 files and production build. Existing bundle-size warning remains.
- `npm run test:e2e`: 16 public-route desktop/mobile Chromium checks passed.
- Synthetic authenticated Pantry duplicate-review and Shopping source-amount disclosure: no overflow or serious/critical axe issues at 320, 390 and 1280px; review dialog keyboard dismissal passed. A local Vite allow-list accommodated shared worktree dependencies; no app configuration changed.
- Pinned CLI database lint against the isolated local database: no schema errors or warnings. Generated types exactly match the final schema.
- Preflight, 56-migration configuration check, documentation audit, secret scan and production dependency audit passed (existing reviewed GHSA-qwww-vcr4-c8h2 exception).
- Upgrade fixtures are retained under `tests/database-upgrades/` for reproduction.
- GitHub Actions and hosted preview results: pending draft publication.

Synthetic browser repositories do not prove hosted authentication or live PostgREST behaviour. Hosted Preview with the new schema, household switching and mobile Safari remain release checks. CS-98 retains unavailable-item restoration and durable bought-item receipt idempotency; this work must not be represented as fixing those separate defects.

## Review and rollback risks

The dictionary deliberately misses uncertain equivalents rather than guessing. Diced tomatoes remain separate from tomatoes; packaged, variety and dietary qualifiers remain significant. Future normaliser expansion requires a versioned migration and matching TypeScript/SQL corpus. Existing duplicate Pantry records may require user choices about amounts and storage; this implementation supplies review rather than automatic reconciliation.
