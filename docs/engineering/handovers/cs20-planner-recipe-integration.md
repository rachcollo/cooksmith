# CS-20 handover: Meal Planner ↔ Recipe Integration

- **Date:** 2026-07-18
- **Status:** Implemented, validation pending
- **Branch:** `feat/cs-20-planner-recipe-integration`
- **Base:** local `work` commit `62b7a7e`; no `origin` remote was available for remote `main` verification.

## What changed

Planned meals can now optionally reference a household recipe. Free-text dinners remain first-class. The planner quick-add/edit flow includes a compact recipe selector that searches the active in-memory household recipe list, snapshots the selected recipe name into the meal title, and saves through the existing planned-meal repository. Linked cards show recipe-link status and can be unlinked without changing the recipe.

## Lifecycle and database release notes

Migration `20260718150000_link_planned_meals_to_recipes.sql` is additive. It adds nullable `cooksmith.planned_meals.recipe_id`, indexes the link, uses `ON DELETE SET NULL`, and adds a trigger that rejects cross-household links. Recipe archive preserves planned meals and the title snapshot. Production deployment must occur only after merge through the protected Production database release workflow using the approved `main` SHA, dry-run and migration-history verification. Released migrations are immutable; fixes require forward migrations.

## Validation summary

See `docs/engineering/reports/cs20-planner-recipe-integration.md` for command evidence. Local type-check, focused unit tests and focused integration tests passed. Full database validation and hosted preview smoke testing remain pending.

## Known limitations

The planner-origin recipe selection flow is delivered. The optional Recipe Library-origin “Add to meal plan” action was not added to avoid cluttering the library UI in this slice. Direct linked-card opening into the full Recipe detail route/dialog remains constrained by the current Recipe Library route structure and should be completed when recipe detail routing is extracted.

## Next milestone readiness

CS-21 shopping-list foundation should not begin until this PR is reviewed, database validation passes, hosted preview smoke testing confirms add/open/move/unlink behaviour, and the branch is accepted into `main`.
