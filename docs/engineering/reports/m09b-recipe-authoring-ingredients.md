# Milestone 9B completion report: Recipe Authoring & Ingredients

- **Date:** 2026-07-17
- **Branch:** `m09b-recipe-authoring-ingredients`
- **Target:** `main`
- **Baseline:** Local `work` commit `124b9e4`; remote `main` could not be verified because no Git remote is configured in this checkout.
- **Status:** Implemented, validation pending for remote baseline, push/PR, pinned runtime preflight, Docker-backed database validation, hosted preview, and CI.

## Scope delivered

Milestone 9B adds structured household recipe authoring while preserving the existing clickable recipe cards and Milestone 9A list, search, detail, edit, and archive behaviours.

Implemented scope:

- ordered ingredient rows with ingredient name, optional quantity, optional unit, optional preparation, explicit add/remove/reorder controls, and legacy text compatibility;
- ordered instruction steps with add/remove/reorder controls and numbered detail presentation;
- recipe-level notes, category, comma-separated tags, and favourite state;
- domain types and validation for structured recipe aggregates, fractions such as `1/2` and `1 1/2`, tag normalisation, safe URLs, and existing summary fields;
- Supabase repository mapping for structured recipe child rows and metadata;
- additive database migration for metadata columns, structured child tables, RLS, grants, ordering constraints, and conservative legacy backfill;
- updated integration and test fixtures for structured recipe aggregates.

## Product Principles supported

- Removes invisible work by keeping ingredients and instructions together in a reusable household recipe record.
- Keeps the experience calm by making optional metadata secondary to name, ingredients, and instructions.
- Protects household trust by extending RLS to structured recipe child records.

## Files changed

| File                                                                     | Purpose                                                                                                                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/domain/recipes/types.ts`                                            | Structured recipe aggregate and input contracts.                                                                               |
| `src/domain/recipes/validationSchemas.ts`                                | Validation for structured ingredients, instruction steps, tags, metadata, quantities, and safe URLs.                           |
| `src/routes/RecipesPage.tsx`                                             | Mobile-friendly authoring/editing UI, structured detail rendering, metadata and favourite controls, clickable cards preserved. |
| `src/infrastructure/recipes/supabaseRecipeRepository.ts`                 | Repository mapping for metadata and structured child records.                                                                  |
| `supabase/migrations/20260717143000_add_structured_recipe_authoring.sql` | Additive schema, constraints, RLS, grants, and legacy backfill.                                                                |
| `tests/renderApp.tsx`                                                    | Test repository fixtures updated for recipe aggregates.                                                                        |
| `tests/integration/recipes.test.tsx`                                     | Integration fixture behaviour updated for structured recipe data.                                                              |

## Validation evidence

| Command                   | Result                                    | Notes                                                                                                                         |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run format`          | Passed                                    | Runner emitted managed `http-proxy` npm warning.                                                                              |
| `npm run format:check`    | Passed                                    | Runner emitted managed `http-proxy` npm warning.                                                                              |
| `npm run lint`            | Passed                                    | Runner emitted managed `http-proxy` npm warning.                                                                              |
| `npm run typecheck`       | Passed                                    | Runner emitted managed `http-proxy` npm warning.                                                                              |
| `npm run test`            | Passed                                    | 24 files / 91 tests passed.                                                                                                   |
| `npm run build`           | Passed with Vite chunk-size warning       | Build completed; Vite reported the existing large bundle advisory.                                                            |
| `npm run db:config:check` | Passed                                    | Database configuration valid with 10 migrations.                                                                              |
| `npm run preflight`       | Failed: environment/repository limitation | Node 24.15.0 and npm 11.4.2 differ from pinned Node 24.14.0 and npm 11.9.0; no Git remote is configured.                      |
| `npm run db:validate`     | Failed: environment limitation            | Database config passed, then runtime prerequisite failed because Node/npm are not pinned and Docker is not running/available. |

## GitHub, CI, and hosted preview

- Remote baseline, push, GitHub Actions, Vercel preview, and hosted smoke tests are pending because this checkout has no configured Git remote.
- A draft PR could not be opened from this environment without a repository remote. PR metadata is prepared in the handover/tool record.

## Security, privacy, production, and cost

- No production database, hosted project, real customer data, secrets, or service-role credentials were accessed.
- The migration is additive and does not deploy Production by itself; Production database release must use the protected workflow after merge of an approved `main` SHA.
- New tables are RLS-enabled with active-household-member read/write policies through the parent recipe.
- Cost impact: A$0 monthly / A$0 annual. No paid services or dependencies were added.

## Known limitations and follow-up

- Repository create/update currently writes parent records and then replaces child rows through normal authenticated Supabase calls. If the child write fails after the parent update, the user sees a failure, but the parent metadata may already have changed. A transactional database function remains the preferred follow-up before accepting the milestone as fully complete.
- Generated database types were not refreshed because local Supabase validation could not start without the pinned runtime and Docker.
- Hosted preview smoke testing and CI remain pending.
