# CS-21 Shopping List Foundation — Completion Report

**Status:** Implemented; remote CI and hosted validation pending

**Baseline:** `main` at `70bd741ad8056bdf77f61ff1de4ec408ae7a5bc5`

**Branch:** `feat/cs-21-shopping-list-foundation`

## Outcome

The Shopping destination is now a working household-shared list with manual add, edit, complete/restore and remove interactions. Outstanding items are grouped by grocery category and completed items remain visible below.

## Persistence and security

The additive migration creates one active shopping-list container per household and household-owned list items with validation, audit triggers, indexes, least-privilege grants and active-membership RLS. CS-22 can use the container without changing CS-21's item contract.

## Validation

- TypeScript, Vitest integration/unit, lint, formatting and build are required locally.
- `supabase/tests/0013_shopping_list_foundation.test.sql` covers constraints, owner/member access, audit identity and unrelated-user denial.
- Docker is unavailable in the local runner, so reset, lint, pgTAP and generated-type freshness require GitHub Actions.
- Hosted Preview mobile/desktop, keyboard and real Supabase persistence remain pending after PR creation.

## Scope and cost

No meal-plan generation, Pantry reconciliation, retailer integration, AI, provider or dependency was added. Cost impact is A$0/month and A$0/year.
