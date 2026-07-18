# CS-20 completion report: Meal Planner ↔ Recipe Integration

- **Date:** 2026-07-18
- **Status:** Implemented, validation pending
- **Branch:** `feat/cs-20-planner-recipe-integration`
- **Baseline:** local `work` commit `62b7a7e` after CS-27 and CS-28 merges. No `origin` remote is configured in this container, so remote `main` verification and publishing are unavailable.

## Scope delivered

CS-20 adds an optional same-household recipe reference to planned meals while preserving free-text dinners. The planner quick-add/edit dialog now lets members start from an active household recipe or continue with free text. Recipe selection copies the recipe name into the planned-meal title snapshot, linked cards show the current recipe name when summary data is available, and unlinking keeps the editable snapshot title.

## Lifecycle decision

Planned meals store `recipe_id` plus the existing `title` snapshot. The database enforces that linked recipes belong to the same household. Recipe archive does not remove or corrupt planned meals; archived links remain understandable from the stored snapshot and linked summary when returned. If a recipe is physically deleted, the foreign key uses `ON DELETE SET NULL`, retaining the planned meal and its title snapshot. No recipe mutation cascades planned-meal deletion.

## Query approach

Week loading still queries only the active household and displayed dates. The planned-meal repository selects a linked recipe summary (`id`, `name`, `archived_at`) with planned meals, avoiding a full recipe aggregate request per card. Full recipe ingredients and instructions remain loaded by the Recipe repository for recipe experiences, not for week rendering.

## Files changed

| File                                                                           | Purpose                                                                                           |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `supabase/migrations/20260718024110_link_planned_meals_to_recipes.sql`         | Additive nullable recipe link, same-household trigger and lifecycle comments.                     |
| `supabase/tests/0011_planned_meals.test.sql`                                   | pgTAP coverage for optional links, cross-household rejection, archive preservation and unlinking. |
| `src/domain/meal-plans/types.ts`                                               | Planned-meal recipe summary and state types.                                                      |
| `src/domain/meal-plans/validationSchemas.ts`                                   | Nullable recipe identifier validation.                                                            |
| `src/domain/meal-plans/recipeLinks.ts`                                         | Snapshot, display-state and unlink domain helpers.                                                |
| `src/infrastructure/meal-plans/supabasePlannedMealRepository.ts`               | Recipe link persistence and summary mapping.                                                      |
| `src/infrastructure/database/generated/database.types.ts`                      | Generated planned-meal `recipe_id` contract.                                                      |
| `src/routes/PlanPage.tsx`                                                      | Planner recipe selection, linked-card state and unlink action.                                    |
| `tests/unit/mealPlanSchemas.test.ts`, `tests/unit/mealPlanRecipeLinks.test.ts` | Unit coverage for validation and link lifecycle helpers.                                          |
| `tests/integration/mealPlanner.test.tsx`, `tests/renderApp.tsx`                | Updated meal-plan fixtures for nullable recipe links.                                             |

## Validation

- `npm exec prettier -- --write ...` passed for changed source and tests, with managed-runner `http-proxy` warnings.
- `npm run typecheck` passed.
- `npm run test:unit -- tests/unit/mealPlanSchemas.test.ts tests/unit/mealPlanRecipeLinks.test.ts` passed (Vitest runs the full unit directory because of the repository script shape).
- `npm run test:integration -- tests/integration/mealPlanner.test.tsx` passed (Vitest runs the full integration directory because of the repository script shape).

Full repository validation, database reset/lint/pgTAP/type freshness, hosted preview smoke testing and CI remain pending in this local environment.

## Security, privacy and cost

No service-role credentials, real household data, Pantry behaviour, shopping-list logic, paid services or recurring costs were added. Cost impact is A$0/month and A$0/year. The database remains the household boundary for recipe links.
