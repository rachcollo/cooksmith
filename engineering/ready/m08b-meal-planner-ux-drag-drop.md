# M08B — Meal Planner UX & Drag-and-Drop

## Metadata
- **Milestone:** `M08B`
- **Jira issue:** `CS-18`
- **Epic:** `Meal Planning (CS-4)`
- **Status:** `Ready`
- **Branch:** `feat/cs-18-meal-planner-drag-drop`
- **Depends on:** `CS-15 / M08A`
- **Blocks:** `CS-20 / M08C`
- **Package path:** `engineering/ready/m08b-meal-planner-ux-drag-drop.md`

## Product Outcome
Households can plan a week quickly by adding meals and moving them directly between days. The planner stays lightweight and obvious: cards are the interaction surface, drag-and-drop is the primary pointer interaction, and equivalent actions remain available without a pointer.

This milestone completes the standalone planner experience. It does not connect meals to recipes or shopping lists.

## Current Baseline
Begin from current `main`. The accepted baseline includes authenticated household access, pantry milestones, M08A weekly planner persistence, add/remove planned meals, and current Supabase/RLS/test conventions. Inspect the actual planner schema and UI before editing. Extend M08A; do not create a parallel planner model.

## Scope
### Included
- Drag meals between days.
- Reorder meals within a day.
- Persist day and order changes.
- Direct quick-add per day.
- Duplicate and remove planned meals.
- Card-centric interactions with progressively disclosed secondary actions.
- Keyboard-accessible move/reorder alternatives.
- Empty, loading, optimistic, error, and mobile states.
- Unit, integration, end-to-end, and preview coverage.

### Explicitly Out of Scope
- Recipe selection or recipe detail integration.
- Shopping-list generation.
- Pantry deduction.
- Fortnightly planning or templates.
- Broad redesign outside the planner.

## Functional Requirements

### FR-1 — Direct quick add
- [ ] Add a free-text meal to a selected day without leaving the planner.
- [ ] Successful save closes or resets the interaction.
- [ ] Blank names cannot be saved.
- [ ] Failed save preserves input and displays an actionable error.
- [ ] Repeated submission cannot create accidental duplicates.

### FR-2 — Move between days
- [ ] Dragging to another day persists the new day/date.
- [ ] UI updates immediately and reconciles with the server.
- [ ] Failed moves roll back to the last confirmed state.
- [ ] Refresh preserves placement.
- [ ] Unrelated meals are not altered.

### FR-3 — Reorder within a day
- [ ] Same-day order persists deterministically.
- [ ] Refresh preserves order.
- [ ] Add/delete operations cannot create invalid or duplicate ordering.
- [ ] Repeated reorder requests settle into a valid sequence.

### FR-4 — Duplicate and remove
- [ ] Duplicate creates a distinct record after the source meal.
- [ ] Remove uses confirmation or undo protection consistent with Cooksmith.
- [ ] Removal targets the exact record, not every meal with the same title.
- [ ] Actions work with keyboard and assistive technology.

### FR-5 — Accessible movement
- [ ] Keyboard users can move a meal to another day.
- [ ] Keyboard users can move a meal earlier/later within a day.
- [ ] Focus remains predictable after move, duplicate, and delete.
- [ ] Movement results are announced accessibly.

### FR-6 — Household isolation
- [ ] Users cannot view or mutate another household’s meals.
- [ ] RLS and server-side authorization protect all planner mutations.
- [ ] Negative cross-household tests are present.

## UX Requirements
- Do not add a permanent destination-day dropdown to every card.
- Use drag-and-drop for pointer movement and a compact menu/action sheet for alternatives.
- Avoid a separate permanent “Open details” button.
- Reveal secondary controls on focus, hover, or overflow.
- Mobile layouts must not hide critical actions.
- Use visible drop targets and drag previews; never rely on colour alone.
- Empty days should invite adding a meal without becoming large empty panels.
- Rejected optimistic changes must recover cleanly.

## Data Requirements
Use the existing planned-meal entity. An ordering field may be added if absent. It must be deterministic, support multiple meals per day, backfill existing records safely, preserve placement, and remain household-scoped.

Migration tests must prove:
- no lost or duplicated meals;
- stable backfilled order;
- RLS coverage for update/reorder;
- no cross-household mutation.

## Technical Direction
- Reuse an existing drag library when suitable.
- If adding one, choose a maintained accessible dependency and justify it.
- Use one authoritative mutation path for pointer and keyboard movement.
- Separate persistence from presentation.
- Implement explicit optimistic rollback/query reconciliation.
- Avoid unrelated planner refactors.

## Test Plan
### Unit
Order calculation, insert/move/duplicate/delete helpers, blank-name validation, rollback logic.

### Integration
Cross-day moves, same-day reorder, exact duplicate/delete behaviour, migration backfill, and cross-household denial.

### End-to-end
Add meals, drag between days, reorder and refresh, keyboard movement, duplicate/delete, and mobile-width flow.

## Definition of Done
- [ ] Drag and accessible movement share persisted behaviour.
- [ ] Day and order survive refresh.
- [ ] Failed mutations recover cleanly.
- [ ] Desktop and mobile planner remain visually simple.
- [ ] Authorization tests pass.
- [ ] Hosted preview validated with pointer and keyboard flows.
- [ ] Jira CS-18 contains PR and preview evidence.
