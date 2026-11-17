# Engineering Package CS-118: Plan a dinner on a chosen day in two taps and scroll the planner on a phone

## Metadata

- **Jira issue:** `CS-118`
- **Jira link:** https://smillins.atlassian.net/browse/CS-118
- **Epic:** Meal Planning (CS-4)
- **Priority:** Medium
- **Status:** `Ready`
- **Branch:** `feat/cs-118-two-tap-planning`
- **Depends on:** CS-96, CS-107, CS-114
- **Blocks:** None
- **Package path:** `engineering/ready/cs118-two-tap-planning.md`
- **Source:** Four-reviewer review, 17 November 2026, findings N3, N6, U4, U6, U7, U11 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

On a phone, a person can put a recipe on the day they choose in two taps, undo a mistake and scroll the week without the cards getting in the way.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Save dinner needs `choiceConfirmed` (`src/routes/PlanPage.tsx:1071`), set only by choosing a dropdown option (`src/routes/meal-plans/MealSearchField.tsx:56-64`).
- Recipe card `+` chooses the date and announces it through `VisuallyHidden` only (`src/routes/RecipesPage.tsx:510-514, 792-803`). Recipe detail has no plan action (`:879-890`).
- `.planned-meal { touch-action: none }` (`src/styles/components.css:1493`).
- Replace is instant with no undo; Remove uses a browser confirm (`src/routes/PlanPage.tsx:473, 488-522`).
- Move is drag or Alt plus arrow (`:584-590`).

## Scope

### Included

- Typed dinner saves as a manual meal.
- Day picker on recipe card and detail.
- Empty day opens recipe choices.
- Drag from handle only.
- Visible Move action.
- Undo for Replace and Remove.
- One visible message pattern for success, error and undo.

### Explicitly Out of Scope

- Lock and selective regenerate (CS-35).
- Atomic server commands (CS-114), which this package consumes.
- Additional meal types (CS-61).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Typing a dinner name and pressing Save adds a manual meal without choosing a dropdown option.
- [ ] From a recipe card or detail a person can choose a day and add in two taps and sees a visible confirmation naming the date.
- [ ] Tapping an empty day offers recipes directly.
- [ ] The planner scrolls when the touch starts on a dinner card; dragging starts from the handle only.
- [ ] Each dinner has a visible Move action that needs neither drag nor keyboard.
- [ ] Replace and Remove take effect immediately with an Undo that restores the dinner and its Shopping contribution.
- [ ] Success, error and undo use one consistent visible message pattern.

## Technical Direction

- Use the CS-114 move and save RPCs; Undo re-applies the previous state through the same commands.
- Freezer-reserved and completed dinners keep their existing confirmation because stock is affected.
- Message region must be `role=status` and not steal focus.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Integration: `mealPlanner`, `mealSearch`, `recipes` suites.
- Playwright: mobile scroll over cards, handle drag, Move action, undo; extend `planner-search.spec.ts`.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None beyond CS-114.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Undo window length. Recommended: until the next action or 8 seconds, whichever is later for assistive technology users.

## Pull Request

Title: `CS-118: Plan a dinner on a chosen day in two taps and scroll the planner on a phone`
