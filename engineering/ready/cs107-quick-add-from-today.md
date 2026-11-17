# Engineering Package CS-107: Recipe quick-add chooses a past date instead of today or later

## Metadata

- **Jira issue:** `CS-107`
- **Jira link:** https://smillins.atlassian.net/browse/CS-107
- **Epic:** Meal Planning (CS-4)
- **Priority:** Medium
- **Status:** `Ready`
- **Branch:** `fix/cs-107-quick-add-from-today`
- **Depends on:** None
- **Blocks:** CS-118
- **Package path:** `engineering/ready/cs107-quick-add-from-today.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S6 (confirms the 15 Oct production observation) (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

Quick-adding a recipe always lands on today or a later empty day, and the person sees which date was chosen.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `quickAddRecipe` passes `currentWeek(today)` (Monday) to `nextEmptyPlanDate` (`src/routes/RecipesPage.tsx:458-462`; `src/domain/meal-plans/quickAdd.ts:9-20`). Reproduced: Thursday 19 Nov returns Monday 16 Nov.
- The confirmation is rendered inside `VisuallyHidden` (`src/routes/RecipesPage.tsx:510-514`).
- Regression against delivered CS-52.

## Scope

### Included

- Search from household-local today into future weeks.
- A visible confirmation naming the date.
- Tests for midweek, today empty, full week and timezone boundary.

### Explicitly Out of Scope

- Plan my week past-day targeting (CS-114).
- Choosing a day from the recipe card (CS-118).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Midweek, empty past days are never selected.
- [ ] When today is empty, today is selected.
- [ ] When the current week is full, the search advances into following weeks.
- [ ] A timezone-boundary case is covered by a test.
- [ ] Existing meals and duplicate-submit protection are preserved.
- [ ] The chosen date is shown visibly as well as announced.

## Technical Direction

- Pass `toLocalIsoDate(new Date())` as the search start and keep the window length.
- Use the household timezone from the profile if it differs from the device, per CS-52.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: `nextEmptyPlanDate` cases. Integration: `recipes` quick-add with a fixed clock.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- None.

## Pull Request

Title: `CS-107: Recipe quick-add chooses a past date instead of today or later`
