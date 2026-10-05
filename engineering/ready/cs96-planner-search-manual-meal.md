# Engineering Package — CS-96: Planner recipe search and manual meals

## Metadata

- **Jira issue:** [CS-96](https://smillins.atlassian.net/browse/CS-96)
- **Epic:** Meal Planning (CS-4)
- **Status:** Implemented; review and hosted/manual acceptance pending
- **Branch:** `feat/cs-96-planner-search-manual-meal`
- **Depends on:** CS-20 and CS-22
- **Blocks:** CS-99 planner integration

## Product Outcome

Replace the long meal dropdown with type-to-search and a safe manual-meal fallback.

## Scope and Decisions

- Use an accessible combobox over household and visible shared recipes.
- Offer `Add “[name]”` only after no suitable recipe is selected.
- Store manual meals as explicit unlinked plan entries, not fake recipes.
- Manual meals contribute no ingredients and remain editable/removable.
- No recipe authoring, AI search or recurring themed nights in this story.

## Acceptance Criteria

- [x] Search responds to typing and handles empty, loading, no-result and failure states.
- [x] Keyboard and screen-reader users can inspect and choose results.
- [x] Recipe selection preserves normal recipe and Shopping links.
- [x] Manual entry is visibly distinguished and contributes no ingredients.
- [x] Stale searches, repeat submits and household changes cannot create wrong entries.
- [x] Drag, reorder, replace, delete and shopping reconciliation regressions pass.

## Technical Direction

Keep result filtering bounded and deterministic. Introduce an explicit meal source/type only if the current nullable recipe identity cannot represent manual entries safely. Validate and authorise writes server-side.

## Verification

Unit/component tests for combobox behaviour, integration tests for both entry types, RLS/database tests if schema changes, and Playwright at mobile/desktop with keyboard and axe. Run full quality checks.

## Release, Rollback and Cost

- **Expected migration:** None. Existing nullable recipe identity represents manual meals and current RLS authorises household writes.
- **Expected Edge Function:** None.
- **Rollback:** Revert UI/domain changes; forward-fix released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-96: Search or add meals in the planner`

## Implementation evidence

Baseline main `b2fb576ebce250e325df297670d62df18c523339` includes merged CS-101. The new MealSearchField bounds visible choices to eight and keeps recipe source identity. Household-keyed route state discards stale searches/editors; an in-flight lock prevents double saves and retry reuses a saved meal after Shopping failure. Existing planner regression coverage remains. Browser fixture uses synthetic UUIDs and no hosted credentials. Hosted/physical assistive-technology acceptance is not claimed; exact counts and CI are recorded in the PR and handover.
