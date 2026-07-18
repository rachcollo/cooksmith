# CS-27 completion report: Multiline Recipe Authoring

- **Status:** Implemented, validation pending for e2e browser installation, local database runtime, hosted preview and CI checks unavailable in this local environment.
- **Date:** 2026-07-18
- **Branch:** `cs27-multiline-recipe-authoring`
- **Baseline:** local branch `work` commit `2e6001ee17cfabc6125d3a74708ef307ad9e6de5`; remote `main` could not be verified because no `origin` remote is configured.

## Scope delivered

CS-27 replaces row-by-row recipe authoring with paste-friendly multiline ingredient and instruction fields while retaining the existing recipe metadata and derived structured child rows used by current recipe display and persistence.

## Product principles supported

- Removes fiddly row management from recipe entry so busy households can paste or type a recipe in one pass.
- Keeps authored recipe text as plain text and preserves household trust boundaries through the existing repository contract.
- Maintains calm, mobile-first forms with visible labels, concise examples and discard confirmation for unsaved changes.

## Files changed

| File                                                            | Purpose                                                                                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/domain/recipes/multilineContent.ts`                        | Adds deterministic multiline splitting, legacy structured-to-multiline compatibility mapping and save-time derived rows.                                                      |
| `src/routes/RecipesPage.tsx`                                    | Replaces ingredient and instruction row editors with labelled textareas, preserves metadata editing, warns before discarding drafts and renders derived display lines safely. |
| `tests/unit/recipeMultilineContent.test.ts`                     | Covers line preservation, Unicode/fraction content, blank-line handling and legacy conversion.                                                                                |
| `docs/engineering/handovers/cs27-multiline-recipe-authoring.md` | Records handover evidence and reviewer instructions.                                                                                                                          |
| `docs/engineering/reports/cs27-multiline-recipe-authoring.md`   | Records this completion report.                                                                                                                                               |

## Migrations and database

None. CS-27 uses the existing `household_recipes.ingredients` and `household_recipes.description` source text fields plus existing derived `recipe_ingredients` and `recipe_steps` child rows. No Production, hosted database or real household data was accessed.

## Validation evidence

| Command or check                                                                                  | Result                 | Notes                                                                                                        |
| ------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm ci`                                                                                          | Passed with warnings   | Managed runner has Node 24.15.0/npm 11.4.2 instead of pinned Node 24.14.0/npm 11.9.0; also emitted warnings. |
| `npm run preflight`                                                                               | Failed due environment | Reports pinned Node/npm mismatch and no Git remote; branch check passed.                                     |
| `npm run format`                                                                                  | Passed                 | Ran before final validation; managed runner emitted `http-proxy` warning.                                    |
| `npm run format:check`                                                                            | Passed                 | All matched files use Prettier style.                                                                        |
| `npm run lint`                                                                                    | Passed                 | No ESLint warnings.                                                                                          |
| `npm run typecheck`                                                                               | Passed                 | Strict TypeScript build completed.                                                                           |
| `npm run test`                                                                                    | Passed                 | 26 files and 96 tests passed.                                                                                |
| `npm run build`                                                                                   | Passed with warning    | Vite reported existing chunk-size warning for the main bundle.                                               |
| `npm run test:e2e`                                                                                | Failed due environment | Playwright Chromium executable is missing.                                                                   |
| `npm run test:e2e:install`                                                                        | Failed due environment | Browser download from Playwright CDN returned HTTP 403.                                                      |
| `npm run db:config:check`                                                                         | Passed                 | Database configuration valid; no migrations added.                                                           |
| `npm run db:prerequisites:runtime`                                                                | Failed due environment | Reports pinned Node/npm mismatch and no Docker-compatible runtime.                                           |
| `npm run test:unit -- tests/unit/recipeMultilineContent.test.ts tests/unit/recipeSchemas.test.ts` | Passed                 | Focused command also ran the configured unit suite: 18 files, 63 tests.                                      |
| `npm run test:integration -- tests/integration/recipes.test.tsx`                                  | Passed                 | Focused command also ran the configured integration suite: 8 files, 33 tests.                                |

## Validation not completed locally

- `npm run preflight` is blocked by managed-runner Node/npm version drift and missing Git remote.
- `npm run test:e2e` is blocked because the Playwright browser is not installed; `npm run test:e2e:install` cannot download Chromium because the CDN returns HTTP 403.
- Local Supabase reset/lint/pgTAP/generated-type runtime checks are blocked by missing Docker-compatible runtime and the same pinned Node/npm mismatch; no schema migration was added.
- Hosted preview validation was not available from this local environment.
- GitHub Actions and Vercel preview status could not be checked because no remote is configured.

## Security, privacy and costs

- **Security/privacy:** Authored recipe content is rendered as React text, not injected HTML. No secrets, credentials, real household data or Production resources were used.
- **Accessibility:** The new authoring controls use visible labels, hint text, field error wiring and native textarea keyboard/paste behaviour.
- **Cost impact:** A$0 monthly and A$0 annual. No dependencies, providers or paid services were added.

## Rollback

Revert this commit to restore the previous row-based recipe authoring UI and remove the multiline mapping tests/report.

## Next work

CS-28 should complete the coordinated lossless recipe content structuring contract before CS-20 or CS-30 begin.
