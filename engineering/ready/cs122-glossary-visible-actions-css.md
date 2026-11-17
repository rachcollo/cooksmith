# Engineering Package CS-122: Consistent words, visible actions and maintainable component styles

## Metadata

- **Jira issue:** `CS-122`
- **Jira link:** https://smillins.atlassian.net/browse/CS-122
- **Epic:** Orchard Editorial design-system migration (CS-82)
- **Priority:** Low
- **Status:** `Ready`
- **Branch:** `refactor/cs-122-glossary-visible-actions-css`
- **Depends on:** CS-111
- **Blocks:** None
- **Package path:** `engineering/ready/cs122-glossary-visible-actions-css.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C14, N5, N6, N7 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

A newcomer sees one name for each thing and a visible control for every action, and the maintainer can change a component's styles without side effects elsewhere.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Mixed terms (`src/routes/PantryPage.tsx:426, 432, 480`; `src/routes/PlanPage.tsx:611`; `src/routes/ShoppingPage.tsx:606`).
- Restock pantry on long-press only (`src/app/navigation/PrimaryNavigation.tsx:34-38, 77-80`).
- Freezer panel above pantry summary (`src/routes/PantryPage.tsx:434`).
- `src/styles/components.css` 2,996 lines; `.planned-meal` defined seven times across two files; 12 breakpoint values; cross-domain class names (`RecipesPage.tsx:759-761`, `PlanPage.tsx:794-815, 961`).
- Colour tokens are clean: no hex values outside `src/styles/tokens.css`.

## Scope

### Included

- A product glossary in the Orchard design documentation, applied across screens.
- Visible controls for gesture-only actions.
- Pantry layout order.
- Per-component style files, four breakpoint tokens, neutral primitive class names.

### Explicitly Out of Scope

- New visual design.
- Dark mode.
- Planner interaction changes (CS-118).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] A glossary of product terms exists in the design documentation and is applied to every screen title, label, loading and error message.
- [ ] Restock pantry and every other gesture-only action has a visible, labelled control.
- [ ] Pantry shows its summary and Add controls first.
- [ ] Styles are split per component or feature and no selector block is defined more than once.
- [ ] Breakpoints use at most four named values.
- [ ] No feature uses another feature's class names.
- [ ] No visual regression at 360, 768 and 1280 px, shown by screenshots in the PR.

## Technical Direction

- Mechanical moves first, renames second, each in its own commit for review.
- Keep `tokens.css` as the single source; add breakpoint custom media or documented constants.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Playwright screenshots at three widths for the six primary routes; axe on each.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Preferred terms for approval: Pantry (not staples), Plan (not Meal Planner), Shopping, Get Ahead, Put away.

## Pull Request

Title: `CS-122: Consistent words, visible actions and maintainable component styles`
