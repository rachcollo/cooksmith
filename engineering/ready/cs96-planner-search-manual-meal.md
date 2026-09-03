# Engineering Package — CS-96: Planner recipe search and manual meals

## Metadata

- **Jira issue:** [CS-96](https://smillins.atlassian.net/browse/CS-96)
- **Epic:** Meal Planning (CS-4)
- **Status:** Ready
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

- [ ] Search responds to typing and handles empty, loading, no-result and failure states.
- [ ] Keyboard and screen-reader users can inspect and choose results.
- [ ] Recipe selection preserves normal recipe and Shopping links.
- [ ] Manual entry is visibly distinguished and contributes no ingredients.
- [ ] Stale searches, repeat submits and household changes cannot create wrong entries.
- [ ] Drag, reorder, replace, delete and shopping reconciliation regressions pass.

## Technical Direction

Keep result filtering bounded and deterministic. Introduce an explicit meal source/type only if the current nullable recipe identity cannot represent manual entries safely. Validate and authorise writes server-side.

## Verification

Unit/component tests for combobox behaviour, integration tests for both entry types, RLS/database tests if schema changes, and Playwright at mobile/desktop with keyboard and axe. Run full quality checks.

## Release, Rollback and Cost

- **Expected migration:** Possible additive meal-source/manual-name fields, confirm from baseline.
- **Expected Edge Function:** None.
- **Rollback:** Revert UI/domain changes; forward-fix released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-96: Search or add meals in the planner`
