# Engineering Package — CS-59: Compact the Plan my Week Review Screen

## Metadata
- **Milestone:** UX-P2
- **Jira issue:** CS-59
- **Epic:** Meal Planning (CS-4)
- **Status:** In Review
- **Branch:** `feat/cs-59-compact-plan-my-week`
- **Depends on:** CS-38
- **Blocks:** None
- **Package path:** `engineering/review/cs59-compact-plan-my-week.md`

## Product Outcome
Make the **Plan my week** proposal easy to scan on a phone by removing repeated instruction copy and presenting each day's proposal as one compact row. The screen should behave like the compact main Plan view: the information and actions needed for a day stay together without oversized cards or repeated labels.

Feature education belongs in onboarding or help, not permanently in a high-frequency workflow. This refinement removes visual clutter while preserving the existing accessible interaction and all CS-38 behaviour.

## Current Baseline
- CS-38 is implemented in PR #69 and provides Plan my week from Recipes and Plan, proposal search, deliberate repeated meals, per-meal replacement, removal, drag/touch reordering, Alt+Arrow keyboard reordering, review-before-Apply and CS-22 Shopping reconciliation.
- The current mobile review shows two explanatory text blocks and vertically large proposal cards with visible **Replace** and **Remove** text buttons.
- CS-59 must be implemented only after CS-38 is merged, deployed and verified. Before coding, inspect the released `main`, the exact hosted UI, CS-38 handover and current tests.

## Scope

### Included
- Remove the introductory sentence: “Existing dinners stay as they are. Cooksmith will fill only the empty days.”
- Remove the visible drag/keyboard explainer beneath **Proposed dinners**.
- Present each proposed dinner as one compact, single-line row at mobile widths.
- Keep the day/date, drag handle, recipe name, Replace action and Remove action together on that row.
- Replace visible button text with compact icon-only controls.
- Preserve accessible names, keyboard interaction, touch interaction and focus states.
- Match the density and visual principles of the released main Plan screen.
- Update component, integration, responsive, accessibility and regression coverage.

### Explicitly Out of Scope
- Changing how meals are generated, shuffled, replaced, removed or reordered.
- Changing whether existing dinners are preserved or how full-week replacement works.
- Changing Apply, persistence, retry or CS-22 Shopping reconciliation.
- Adding onboarding/help UI; that future work is CS-60.
- Database, RLS, Edge Function, dependency, provider or production-configuration changes.
- Broad redesign of Recipes, Plan or the proposal dialog.

## Functional Requirements

### FR-1 — Remove repeated explanatory copy
The review should lead with the week and proposed meals rather than repeating instructions on every use.

**Acceptance criteria**
- [ ] The sentence “Existing dinners stay as they are. Cooksmith will fill only the empty days.” is not rendered.
- [ ] The visible drag-and-keyboard explainer below **Proposed dinners** is not rendered.
- [ ] Removing the visible explainer does not remove the drag handle's accessible name, keyboard instructions available to assistive technology, or reorder behaviour.
- [ ] No replacement explanatory paragraph, tooltip that opens automatically or extra confirmation step is introduced.
- [ ] Empty, error and recovery messages remain available when they communicate a current state rather than generic instructions.

### FR-2 — Compact one-line proposal rows
Each proposed dinner uses the same compact one-row principle as the main Plan screen.

**Acceptance criteria**
- [ ] At 320–390px widths, each proposal is presented on one compact row.
- [ ] The row contains, in a stable order, the drag handle, compact day/date, recipe name, Replace icon button and Remove icon button.
- [ ] The recipe name receives the flexible width; controls remain visible and do not overlap.
- [ ] Long recipe names truncate with an ellipsis on the compact row and the full name remains available through an accessible name/title or the existing recipe-selection control.
- [ ] The row does not introduce horizontal page or dialog overflow at 320px.
- [ ] Vertical spacing is materially reduced so more of the seven-day proposal is visible before scrolling.
- [ ] Tablet and desktop layouts remain compact and readable rather than expanding back into oversized cards.

### FR-3 — Icon-only actions remain understandable
Visible **Replace** and **Remove** text labels are removed without weakening usability.

**Acceptance criteria**
- [ ] Replace uses the existing refresh/replace visual or another established Cooksmith icon.
- [ ] Remove uses the established delete/remove visual.
- [ ] Neither action shows a visible text label in the normal row.
- [ ] Every Replace control has a contextual accessible name such as “Replace dinner for Monday 20 July”.
- [ ] Every Remove control has a contextual accessible name such as “Remove dinner for Monday 20 July”.
- [ ] Each control retains at least a 44px interactive target even when the visible icon is smaller.
- [ ] Visible focus, disabled and busy states remain clear without relying on colour alone.
- [ ] Icon controls do not trigger native hover-only help as the only way to understand the action.

### FR-4 — Preserve all CS-38 behaviour
This package changes presentation density only.

**Acceptance criteria**
- [ ] Dragging a handle still swaps proposal days.
- [ ] Alt+Up/Down or the released keyboard alternative still reorders the focused proposal.
- [ ] Replace changes only the selected proposal and preserves deliberate duplicate-recipe selection.
- [ ] Remove clears only the selected proposal.
- [ ] Recipe search remains keyboard and screen-reader operable.
- [ ] Cancel and close perform no planner or Shopping writes.
- [ ] Apply writes the reviewed proposal once and retains idempotent CS-22 Shopping reconciliation.
- [ ] Existing occupied-day and full-week replacement rules remain unchanged.

## UX and Interaction Requirements
- Use the released Plan screen as the density reference, not as a source for unrelated redesign.
- Keep the dialog heading and week range; begin proposal content immediately after the header.
- Use abbreviated weekday/date presentation where needed to keep the row compact, while exposing the full date accessibly.
- Preserve 44px touch targets, visible focus, semantic list structure, predictable focus after Replace/Remove and reduced-motion behaviour.
- Do not rely on hover, colour, gesture or icon shape alone.
- At 200% zoom and 320 CSS pixels, preserve reflow and access to every action.

## Data and Domain Requirements
- No data-model or repository changes are expected.
- Do not alter planner mutation, recipe visibility, household scoping or Shopping reconciliation contracts.
- Do not log recipe names, household content, identities or credentials.
- Any discovered need for schema, RLS or cross-domain behaviour change is a scope stop requiring product review.

## Technical Direction
- Refine the existing CS-38 proposal component and styles after they land on `main`.
- Reuse established Button/icon primitives and visually-hidden accessible text patterns.
- Keep proposal-row semantics testable and avoid CSS-only DOM reordering that changes reading/tab order.
- Prefer responsive grid/flex constraints with `min-width: 0` and explicit action columns.
- Do not duplicate the proposal component for mobile and desktop.
- No dependency or ADR is expected.

## Implementation Guidance
1. Verify CS-38 is Done, merged, deployed and tested; start from the latest accepted `main`.
2. Capture the released proposal DOM, styles, accessible names and regression tests.
3. Add/adjust tests for removed copy, one-row content order, contextual icon labels and retained interaction.
4. Implement the smallest component/style refinement.
5. Run the full AIEOS quality suite and responsive/accessibility browser checks.
6. Validate the exact Vercel Preview on a 320–390px mobile viewport with long recipe names.
7. Record evidence in the PR and Jira; stop before merge.

## Test Plan

### Unit and component tests
- Removed explanatory strings are absent.
- Proposal rows expose date, recipe, contextual Replace and contextual Remove names.
- Icon actions retain disabled/busy and focus behaviour.
- Long names do not remove access to the full recipe name.
- Keyboard reorder instructions remain available to assistive technology.

### Integration tests
- Replace changes only one proposal.
- Remove clears only one proposal.
- Drag and keyboard reorder still swap expected dates.
- Cancel performs no writes.
- Apply preserves planner and Shopping reconciliation behaviour.

### End-to-end, accessibility and responsive tests
- Open **Plan my week** from Recipes and Plan.
- Review all seven rows at 320px, 390px, tablet and desktop.
- Verify no horizontal overflow with a deliberately long recipe name.
- Keyboard through handle, recipe search, Replace and Remove for multiple rows.
- Run axe against the proposal dialog.
- Verify 200% zoom/reflow and reduced motion.
- Apply once and confirm Plan/Shopping regression behaviour.

## Hosted Preview Scenarios
- [ ] On iPhone/mobile, the two requested explanatory blocks are absent.
- [ ] Each day displays as one compact row with handle, date, recipe and two icon-only actions.
- [ ] Seven rows require materially less scrolling than the CS-38 baseline.
- [ ] Long recipe names do not hide Replace/Remove or overflow the dialog.
- [ ] Replace, Remove, drag/touch reorder and keyboard reorder still work.
- [ ] Close/cancel writes nothing; Apply updates Plan and Shopping once.
- [ ] Keyboard focus, accessible names, 200% zoom and representative screen-reader announcements are verified.

## Quality Gates
- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Applicable Playwright responsive and axe checks pass.
- [ ] Package readiness validation passes.
- [ ] No secrets, credentials or real household data are committed.
- [ ] Exact hosted Preview is manually validated.
- [ ] Jira contains the PR and current evidence.

## Definition of Done
- [ ] All acceptance criteria and regression tests pass.
- [ ] CS-38 behaviour and CS-22 Shopping reconciliation remain intact.
- [ ] GitHub Actions and Vercel pass on the exact head SHA.
- [ ] Mobile, keyboard, reflow and accessibility evidence is recorded honestly.
- [ ] Migration and Edge Function impact are declared as none.
- [ ] Security, privacy, production and A$0 cost impact are recorded.
- [ ] PR is reviewed and merged by a human.
- [ ] Production application deployment is verified.
- [ ] Jira is Done and the package is moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Migrations in this package:** None.
- **Edge Functions in this package:** None.
- **Production effect before merge:** None; package approval is documentation only.
- **Rollback:** Revert the compact component/style changes; no data rollback is required.
- **New dependency/provider:** None.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements
Implementation PR title: `[CS-59] UX-P2 — Compact the Plan my Week Review Screen`

Include Jira/package links, before/after mobile evidence, exact strings removed, proposal-row structure, interaction regressions, accessibility evidence, Preview result, release declarations, rollback and A$0 cost confirmation.
