# Milestone 9A handover: Recipe Library Foundation

- **Date:** 2026-07-17
- **Branch:** work (requested: `m09a-recipe-library-foundation`)
- **Target:** `main`
- **Commit:** final local feature commit (see Git handover output)
- **Pull request:** metadata prepared with make_pr; no Git remote is configured locally
- **Status:** Implemented, database validation environment-limited

## Objective

Milestone 9A creates the household Recipe Library foundation for manual recipe summary management.

## Product impact

- **Product Principles supported:** calm, practical household memory and trust-preserving household boundaries.
- **User effort removed:** recipes no longer need to live outside Cooksmith for basic household reference.
- **Primary next action improved:** household members can record and return to core recipe information.
- **Product behaviour changed:** Yes; `/recipes` is now a working Recipe Library rather than a placeholder.

## Changes made

Added recipe schema, RLS, validation, repository, provider wiring, library UI, focused tests, completion report and handover.

## Files and components affected

| File or component                                              | Purpose                                                                 |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `supabase/migrations/20260717090000_create_recipe_library.sql` | Creates recipe table, constraints, RLS and audit trigger.               |
| `src/routes/RecipesPage.tsx`                                   | Implements recipe library, create, detail, edit, search and archive UI. |
| `src/domain/recipes/*`                                         | Adds recipe types and validation.                                       |
| `src/application/recipes/recipeRepository.ts`                  | Defines recipe persistence port.                                        |
| `src/infrastructure/recipes/supabaseRecipeRepository.ts`       | Implements Supabase recipe repository.                                  |
| `tests/unit/recipeSchemas.test.ts`                             | Covers recipe validation.                                               |
| `tests/integration/recipes.test.tsx`                           | Covers recipe user flows.                                               |

## Migrations

`20260717090000_create_recipe_library.sql` after existing household, authorisation and pantry migrations.

## Setup instructions

Run Supabase migration validation against the isolated local database; no new environment variables are required.

## Tests run

| Command or check                                                                      | Result              | Notes                                                                                                      |
| ------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                              | Passed with warning | Runner version differs from pinned engines.                                                                |
| `npm run format`                                                                      | Passed              | Formatting applied.                                                                                        |
| `npm run format:check`                                                                | Passed              | Formatting check passed.                                                                                   |
| `npm run lint`                                                                        | Passed              | Lint passed.                                                                                               |
| `npm run typecheck`                                                                   | Passed              | TypeScript passed.                                                                                         |
| `npm run test`                                                                        | Passed              | 21 files / 73 tests.                                                                                       |
| `npm run build`                                                                       | Passed with warning | Vite chunk-size warning.                                                                                   |
| `npm run db:config:check`                                                             | Passed              | Database config passed.                                                                                    |
| `npm run db:validate`                                                                 | Environment-limited | Blocked by Node/npm version mismatch and unavailable Docker runtime.                                       |
| `npm run test -- tests/unit/recipeSchemas.test.ts tests/integration/recipes.test.tsx` | Passed              | Focused recipe validation and UI flows.                                                                    |
| credential-pattern `rg` scan                                                          | Passed with review  | Matches were expected existing auth/invitation code and synthetic tests; no newly introduced secret found. |

## Preview or verification instructions

Open `/recipes`, create a recipe, verify detail display, edit and cancel an edit, search by name, clear search, archive a recipe, and confirm Pantry/household navigation still works.

## Accessibility, security, privacy and cost

- **Accessibility:** Reuses labelled fields, buttons and accessible dialog primitives; final manual keyboard and mobile checks remain pending.
- **Security and privacy:** RLS gates recipes by active household membership; URLs render as safe links and descriptions as plain text.
- **Cost impact:** A$0/month and A$0/year.
- **Credential check:** Staged-content credential scan reviewed; no newly introduced secret found.

## Known limitations

Structured ingredients, method steps, imports, meal-plan integration, restoration UI and image upload are intentionally deferred. Hosted preview and database validation remain pending in a suitable environment.

## Deferred work

Recipe ingredients and method steps (9B), meal-plan recipe selection (10A), shopping-list generation, AI/imports, nutrition and public sharing.

## Rollback approach

Before release, revert the feature commit. After release, add a forward migration to remove or disable recipe-library objects if required; do not edit a released migration.

## Recommended next milestone

Milestone 9B — Recipe Ingredients and Steps. Do not begin it until Milestone 9A is accepted and merged.
