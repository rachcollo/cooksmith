# Engineering Package CS-111: Quantity fields keep decimals and dialogs stay open when I choose to keep editing

## Metadata

- **Jira issue:** `CS-111`
- **Jira link:** https://smillins.atlassian.net/browse/CS-111
- **Epic:** Beta Launch (CS-8)
- **Priority:** Highest
- **Status:** `Ready`
- **Branch:** `fix/cs-111-numeric-fields-and-dialogs`
- **Depends on:** None
- **Blocks:** CS-122
- **Package path:** `engineering/ready/cs111-numeric-fields-and-dialogs.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S2, C13, U5 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

What a person types into an amount is what Cooksmith saves, and a dialog with unsaved work stays open when the person chooses to keep editing.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Numeric inputs bind `value={String(n)}` to `Number(event.target.value)`: typing 1.5 stores 15, 0.5 stores 5 and a letter shows NaN (`src/routes/ShoppingPage.tsx:518-523, 615-625, 778-783`; `src/routes/RecipesPage.tsx:538-575, 917-950`; `src/routes/PlanPage.tsx:1008`). Reproduced in the review.
- `ModalSurface` calls `dialog.close()` before `onOpenChange(false)` (`src/components/ui/ModalSurface.tsx:50-57, 80`). When the parent declines, React state stays open with the native dialog closed and the trigger no longer reopens it (`src/routes/RecipesPage.tsx:520-522, 603-605`). Reproduced in the review.
- 16 `window.confirm` calls exist across Plan, Shopping, Recipes, Pantry, Freezer, Settings and Admin.

## Scope

### Included

- One shared numeric field component that holds the raw text and parses on change and submit.
- Adoption in Shopping, Recipes, Pantry, Planner, Put away and Freezer.
- A close-request contract for `ModalSurface`, `Dialog` and `Sheet` so the parent decides before the native dialog closes.
- A shared confirmation dialog replacing every `window.confirm`.

### Explicitly Out of Scope

- Undo toasts for Replace and Remove (CS-118).
- Any change to validation limits or units.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Every numeric field accepts 1.5, 0.5 and 0.25 and saves the typed value.
- [ ] No field ever displays NaN; invalid input shows an associated field error and blocks save.
- [ ] One shared numeric component is used by all six areas.
- [ ] Declining a discard prompt leaves the dialog open with the draft intact.
- [ ] The trigger button reopens a closed dialog every time.
- [ ] No `window.confirm` call remains in `src`.
- [ ] Confirmation dialogs return focus to the invoking control and work with keyboard and screen reader.

## Technical Direction

- Keep string state inside the component; expose `number | null` plus validity to the form.
- Accept a comma decimal separator and trim whitespace; do not use `type=number`.
- Handle the native `cancel` event and the close button through one `requestClose` path.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: numeric parsing table including fractions already supported by `parseIngredientQuantity`.
- Integration: decimal entry in Shopping quick add, purchase edit and inline edit; vetoed close then reopen in Recipes.
- Playwright: mobile keyboard entry and Escape handling with axe.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- None.

## Pull Request

Title: `CS-111: Quantity fields keep decimals and dialogs stay open when I choose to keep editing`
