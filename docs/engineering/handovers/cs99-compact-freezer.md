# CS-99 follow-up: compact freezer stock and recipe search

- **Date:** 2026-10-07
- **Branch:** `feat/cs-99-compact-freezer`
- **Target and accepted baseline:** `main`, `19bb8c573c5f7dc75c595285a967fcd876d8974f` (PR192).
- **Status:** Implemented, owner visual and hosted/manual validation pending. Draft review only.
- **Commit/PR:** Exact head and CI evidence are recorded in the follow-up PR description.

## Objective and product impact

The owner reports that the empty Freezer section consumes almost the whole first Pantry screen. The parent inspected the supplied screenshot: a large heading/explanation, stacked Add and Refresh buttons, archive control and empty message push inventory controls towards the fixed navigation. Keep prepared meals easy to add and stock easy to see while returning space to Pantry. No Home redesign.

## Changes

- A compact “Freezer meals” disclosure shows active meal count and available portion count alongside Add meal. Stock starts collapsed on each Pantry visit; saving expands it to show the result. The expanded area contains stock cards, explanation, archive controls and manual refresh.
- Stock loads on entry and refreshes when the window regains focus or becomes visible. No timer, cron or provider job. Errors retain known stock and expose retry; unavailable initial stock is not presented as zero. Request ordering rejects older responses, and household changes discard old forms/results.
- Add meal opens the existing dialog. Meal name directly reuses Plan's `MealSearchField`, with a configurable label that defaults to Dinner for existing callers. Shared input/anchor styles are available without first visiting Plan.
- Only a clicked/keyboard-selected visible recipe creates a link. Household and shared recipes are eligible; private and archived recipes remain excluded. Typing a different name clears its link. Manual selection or saving an unlinked typed name remains a manual freezer meal. Recipe loading, failures and late results never replace the typed text.
- The optional date label is exactly **Add to this day**. This is the requested label change to existing `useFirstOn` metadata, with the existing frozen-date validation. It does not create a plan entry, reserve portions or change date semantics.
- Existing freezer command IDs, revision checks, reservation/use/undo, archive/restore and household isolation remain. Linking a recipe still generates no raw shopping ingredients.
- The existing narrow Pantry toolbar exceeded the viewport at 200% text. Its search column now shrinks within the viewport and action controls retain 48px targets. At normal 320px, the compact freezer row leaves Pantry search/filter/add above the fixed navigation.

## Files and setup

`FreezerPanel.tsx`, shared `MealSearchField.tsx`, shared/Plan CSS, date validation copy, freezer component/browser fixtures/tests and WebKit test selection. No new dependency, environment variable or setup. No database schema, SQL function, RLS, grants or generated types changed.

## Validation

| Check                                      | Evidence                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean install and static suite             | `npm ci` with writable npm cache; `npm run validate:static`: 630 tests / 85 files, formatting, lint, TypeScript and build                                                                                            |
| Browser suite                              | 52 checks: Chromium/mobile and eight WebKit checks; freezer lifecycle, compact empty/loaded/long names, recipe/manual selection, keyboard, correct popup anchoring, 320px, 200% text, visible Pantry toolbar and axe |
| Synthetic local database replay/seed/pgTAP | 612 assertions / 36 files, including existing freezer reservations, shopping exclusion and household isolation                                                                                                       |
| Real local PostgREST HTTP                  | 4 checks passed, including stale freezer revision conflicts                                                                                                                                                          |
| Preflight/docs/config/secrets/dependencies | Passed; existing reviewed browser-only React Router RSC exception                                                                                                                                                    |

Initial checks exposed a too-tall toolbar, missing heading hierarchy and existing enlarged-text Pantry overflow; these were fixed. Screenshot review caught the previously Plan-only dropdown anchor CSS, now shared. No assertions were removed to make checks pass. Final exact-head CI and Vercel build evidence are in the PR. Public smoke or automatic Jira Done is not functional acceptance.

Local synthetic runtime: PostgreSQL17/PostgREST14.5; loopback-only API tests. WebKit uses extracted local runtime libraries, while CI installs normal dependencies. No real household data, credentials, production mutation or paid evaluation. Screenshots/logs are in `/workspace/cooksmith-review/cs99-compact/` in the saved environment.

## Owner/hosted verification still pending

On an authorised account, open Pantry directly at phone width: verify the compact count/Add row and unobscured inventory controls. Expand stock, add an explicit recipe-linked meal, then an unmatched manual meal. Confirm typing and recipe-loading errors preserve the name. Check the exact date label and date validation; no plan is created until the existing Plan workflow is used. Reserve in Plan, mark used, undo, remove the reservation and verify the stock returns. Test another member and household switch. Physical Safari/VoiceOver and authenticated hosted checks are not claimed.

## Release, rollback and integration

- **Migrations in this PR:** None. **Edge Functions changed:** None. No new database/Edge release step is required for this follow-up; existing accepted PR192 schema remains its baseline prerequisite.
- The owner's accepted pre-MVP maintenance workflow remains unchanged. This PR does not require staging or zero-downtime promotion. No merge/deploy performed.
- PR193 and PR197 were still open and mergeable at inspection. This branch starts from accepted main, not either unmerged feature. If PR197 merges first, retain both its Shopping styles and these Pantry styles, and include both `shopping-period.spec.ts` and `freezer.spec.ts` in WebKit alongside `purchase-groups.spec.ts`. Recheck/test the integrated head after each owner merge.
- Rollback this presentation change while retaining existing freezer data and transaction functions. No data cleanup is needed.
- Incremental cost A$0/month and A$0/year. No new provider/dependency.

Owner visual acceptance and hosted/manual checks remain pending. No later MVP scope or Home polish has started.
