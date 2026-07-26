# CS-87 Orchard Plan and Shopping handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-87-orchard-plan-shopping`
- **Target:** `main`
- **Baseline:** `507071e71137c16680c303aa6be7eda13ca5cc0c`
- **Implementation commit:** `2babf12b254f6ba8461c03a2526241443852e38c`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Move Plan and Shopping into the Orchard Editorial system while preserving the existing
seven-day planning, pointer and keyboard movement, generation, shopping grouping,
completion and Pantry reconciliation workflows. The migration makes long meal and item
names readable and adds no new product behaviour.

## Changes made

- Added current weekly progress as mono metadata without changing seven-day calculations.
- Promoted the existing Plan my week action to the shared Orchard accent variant.
- Restyled Plan days as accented Orchard cards and empty days as dashed add slots.
- Allowed long meal names and notes to wrap rather than truncate.
- Restyled Shopping as a centred reading list with mono category headers.
- Applied Orchard list rows and square forest/lime completion controls.
- Kept Pantry-match guidance as visible text reached through the existing accessible
  question control, with a non-colour-only explanation.
- Added route regression assertions for progress metadata, the accent generation action,
  dashed slots and Shopping category structure.

## Files affected

| File                                               | Purpose                                      |
| -------------------------------------------------- | -------------------------------------------- |
| `src/routes/PlanPage.tsx`                          | Weekly metadata and empty-slot composition   |
| `src/routes/meal-plans/WeekPlanGenerator.tsx`      | Orchard accent generation action             |
| `src/routes/ShoppingPage.tsx`                      | Outstanding-count route metadata             |
| `src/styles/components.css`                        | Orchard Plan and Shopping responsive styling |
| `tests/integration/mealPlanner.test.tsx`           | Plan migration regression evidence           |
| `tests/integration/shopping.test.tsx`              | Shopping migration regression evidence       |
| `engineering/review/cs87-orchard-plan-shopping.md` | Package lifecycle evidence                   |

## Validation

| Command or check                          | Result      | Notes                                           |
| ----------------------------------------- | ----------- | ----------------------------------------------- |
| `npm ci --cache=/tmp/cs87-npm-cache-2`    | Passed      | Exact lockfile installed with writable cache    |
| `npm run format` / `npm run format:check` | Passed      | Repository formatting clean                     |
| `npm run lint`                            | Passed      | Zero warnings                                   |
| `npm run typecheck`                       | Passed      | Strict TypeScript build                         |
| `npm run test`                            | Passed      | 50 files, 260 tests                             |
| `npm run build`                           | Passed      | Production bundle built                         |
| `npm run docs:commands:check`             | Passed      | 145 documented files audited                    |
| `npm run engineering:check-secrets`       | Passed      | No forbidden files or high-confidence secrets   |
| `npm run security:audit-production`       | Passed      | Reviewed browser-only React Router exception    |
| `npm run preflight`                       | Unavailable | Supabase CLI unavailable in this managed runner |
| `npm run test:e2e`                        | Unavailable | Playwright Chromium executable is not installed |

The managed runner also reports its existing `http-proxy` npm warning. It is not produced
by repository configuration. The two unavailable runner checks remain required in CI or
hosted validation.

## Preview and manual verification

On the exact Vercel Preview:

1. At 320 px, 390 px, 768 px, 1024 px and 1280 px, open Plan and Shopping and confirm
   there is no horizontal overflow or essential text truncation.
2. In Plan, verify fully populated, partly empty and fully empty weeks, including the
   progress metadata, dashed slots and generating/busy states.
3. Exercise previous week, next week, back to this week, add, edit, remove, replace and
   Plan my week; confirm the planner remains seven days.
4. Move meals by pointer drag and by Alt+Left/Right; confirm both paths have the same
   persisted result and visible error recovery.
5. In Shopping, verify category grouping, empty/nothing-to-buy, completed and long-item
   states; complete and reopen items and refresh to confirm persistence.
6. Exercise Pantry-match guidance and the completed-item put-away proposal, including
   separate-item and existing-item reconciliation.
7. Keyboard through both routes and dialogs; run axe and confirm no serious or critical
   findings.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Dependencies:** None added or changed.
- **Accessibility:** Existing names, roles, dialog behaviour, movement instructions and
  44-pixel controls are preserved. Status is not colour-only and long content wraps.
  Hosted axe, keyboard and responsive verification remain pending.
- **Security and privacy:** No auth, permission, household, persistence, provider or
  logging code changed. Tests use synthetic data only.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation and evidence commits. No data, provider or
  configuration repair is required.

## Deferred work

Fortnight planning, persistent meal locks, retailer copy/export and multi-column aisle
layouts remain outside CS-87. CS-89 must wait until the remaining Orchard route migrations
are accepted.
