# CS-27 handover: Multiline Recipe Authoring

- **Date:** 2026-07-18
- **Branch:** `cs27-multiline-recipe-authoring`
- **Target:** `main`
- **Commit:** Local CS-27 commit; see final handover for exact hash
- **Pull request:** Pending connected PR creation
- **Status:** Implemented, validation pending for e2e browser installation, local database runtime, hosted preview and CI evidence

## Objective

Replace row-by-row recipe ingredient and instruction entry with two forgiving multiline fields while keeping authored source text recoverable and saving derived ordered rows for current and future recipe features.

## Product impact

- **Product Principles supported:** Quietly removes invisible household effort by allowing paste-first recipe entry.
- **User effort removed:** Users no longer add, remove or reorder individual ingredient and step rows while drafting.
- **Primary next action improved:** Create and edit recipe forms now centre on two native textareas for ingredients and instructions.
- **Product behaviour changed:** Yes. Recipe creation and editing now use multiline ingredients and instructions, with safe derived display lists and unsaved-change confirmation.

## Changes made

- Added domain helpers for multiline recipe source text, derived ingredient/step rows and structured legacy recipe conversion.
- Replaced create/edit row controls with labelled multiline textareas and concise examples.
- Preserved metadata editing for notes, category, tags, favourite status, source, timing, servings and image URL.
- Added dirty-draft discard confirmation for create and edit dialogs.
- Added unit coverage for multiline splitting, source preservation, Unicode/fractions and legacy conversion.

## Files and components affected

| File or component                                               | Purpose                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `src/domain/recipes/multilineContent.ts`                        | Multiline source and derived-content boundary.       |
| `src/routes/RecipesPage.tsx`                                    | Recipe authoring, editing, display and discard flow. |
| `tests/unit/recipeMultilineContent.test.ts`                     | Focused multiline domain tests.                      |
| `docs/engineering/reports/cs27-multiline-recipe-authoring.md`   | Completion evidence.                                 |
| `docs/engineering/handovers/cs27-multiline-recipe-authoring.md` | Reviewer handover.                                   |

## Migrations

None.

## Setup instructions

None beyond the existing application setup.

## Tests run

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

## Preview or verification instructions

1. Open the Recipes page in a preview build.
2. Add a recipe by pasting several ingredient lines and several instruction lines, including blank lines and Unicode fractions.
3. Save, reopen and confirm the visible detail keeps the same order and text.
4. Edit the recipe on a narrow viewport, change metadata and confirm cancelling a dirty draft asks before discarding.

## Accessibility, security, privacy and cost

- **Accessibility:** Uses visible textarea labels, hint text, native keyboard/paste behaviour and existing error association.
- **Security and privacy:** Plain-text rendering only; no Production resources, real data or secrets used.
- **Cost impact:** A$0 monthly and A$0 annual.
- **Credential check:** Staged content must be scanned before commit; no credential-like values were intentionally added.

## Known limitations

- Hosted preview, GitHub Actions and Vercel checks were not available locally.
- CS-28 remains responsible for the richer lossless structuring contract beyond this deterministic line derivation boundary.

## Deferred work

CS-28 lossless content structuring, CS-30 URL import, CS-29 Cook With Me, meal planner integration, shopping list and Pantry integration remain out of scope.

## Rollback approach

Revert the CS-27 commit to restore the previous structured row editor and remove the new domain helper/tests/docs.

## Recommended next milestone

Complete CS-28 after CS-27 is accepted; do not begin CS-20 or CS-30 until the shared recipe contract is merged.
