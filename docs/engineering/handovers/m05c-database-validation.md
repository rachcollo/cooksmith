# Milestone 5C handover: Database and RLS validation

## Objective

Prove the Milestone 5 household database and RLS boundary with real, adversarial PostgreSQL execution before any product workflow depends on it.

## Changes made

- Added a deterministic inactive Household A member.
- Added complete operation-oriented tenant isolation tests for every private table.
- Added missing, malformed and stale JWT scenarios.
- Added helper hardening, self-escalation, global-role separation and identifier manipulation tests.
- Added catalog and TypeScript API-contract checks.
- Added a static guard against accidental private-schema Data API exposure.
- Added explicit security-suite enforcement to the existing isolated Supabase CI job.
- Documented the final Milestone 5 policy and verification matrix.

No product code, route, authentication workflow, dependency or database migration changed.

## Security and privacy

Tests execute real grants, policies and helpers. They use only deterministic synthetic identities and never contact a hosted or production database. Current private data includes profile, preference, dietary and allergy records, so all checks remain default deny and tenant scoped.

## Migration and generated types

Testing exposed no schema or policy defect, so no forward migration was necessary. CI resets from immutable migrations and regenerates `database.types.ts`; freshness is a required gate.

## Cost and credentials

No dependency, provider, paid service or recurring cost was introduced. No secret, credential, email, password or real household data was added.

## Recommended next milestone

Milestone 6 may begin only after this pull request is accepted and the complete remote database gate passes. It must preserve and extend the private-table checklist in the database and testing standards.
