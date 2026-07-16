# Production database release workflow handover

- **Date:** 2026-07-16
- **Branch:** `ops/production-database-release`
- **Target:** `main`
- **Status:** Ready for review

## Objective

Provide an auditable, manually approved, no-Terminal path for releasing
Cooksmith migrations to the approved hosted Supabase project.

## Changes made

Added a main-only GitHub Actions release workflow, protected-environment secret
contract, dry-run and migration-history verification, release runbook, and
completion report. No product code, migration, provider, or database data was
changed.

## Setup instructions

After merge, create the `production-database` GitHub environment, require a
reviewer where supported, and add the three secrets documented in the runbook.
Then dispatch the workflow using the exact approved `main` SHA.

## Security, privacy and cost

- Secrets are environment-scoped and never accepted as workflow inputs.
- The workflow cannot reset or seed Production.
- No production data or credentials were accessed.
- Cost impact: A$0 monthly and annually.

## Rollback approach

Do not edit a released migration. Use a reviewed forward-fix migration, or an
approved Supabase recovery plan when a forward fix cannot safely preserve data.
