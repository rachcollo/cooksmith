# M08C — Meal Planner and Recipe Integration

## Metadata
- **Milestone:** `M08C`
- **Jira issue:** `CS-20`
- **Epic:** `Meal Planning (CS-4)`
- **Status:** `Planned until dependencies complete`
- **Branch:** `feat/cs-20-planner-recipe-integration`
- **Depends on:** `CS-15`, `CS-16`, preferably `CS-18` and `CS-19`
- **Blocks:** `CS-21 / M10A`
- **Package path when ready:** `engineering/ready/m08c-planner-recipe-integration.md`

## Product Outcome
A household can plan a meal by choosing a recipe, see useful recipe information on the planner card, and open that recipe from the planner. Free-text meals remain supported.

The relationship must remain understandable if a recipe changes or is deleted, and must provide a stable foundation for later shopping-list generation.

## Entry Criteria
Do not start until:
- M08A and M09A are merged and stable.
- Current planner and recipe schemas are reviewed.
- M08B and M09B are merged, or the user explicitly accepts parallel integration risk.
- CS-20 is moved to Ready.
- This package is moved into `engineering/ready/`.

## Scope
### Included
- Select a household recipe while adding/editing a meal.
- Continue supporting free-text meals.
- Persist an optional recipe reference.
- Persist enough display snapshot data to retain meaning after recipe change/deletion.
- Display linked recipe information on planner cards.
- Open recipe details from the card.
- Edit, replace, unlink, and deletion behaviour.
- Household isolation and full test coverage.

### Explicitly Out of Scope
- Shopping-list generation or ingredient aggregation.
- Pantry deduction.
- Nutrition.
- Public recipe links or recommendations.

## Functional Requirements

### FR-1 — Add a recipe-backed meal
- [ ] Recipe selection shows only active-household recipes.
- [ ] Selection creates a linked planned meal.
- [ ] Display text is derived without duplicate entry.
- [ ] Free-text planning remains available.
- [ ] Mobile flow remains quick.

### FR-2 — Display linked information
- [ ] Linked card displays recipe title.
- [ ] Optional metadata appears only when useful.
- [ ] Free-text cards remain unchanged.
- [ ] Card works with drag-and-drop.
- [ ] Linked state is not indicated by colour alone.

### FR-3 — Open recipe from the card
- [ ] Activating a linked card opens recipe details.
- [ ] No permanent “Open details” button is required.
- [ ] Drag initiation does not accidentally open details.
- [ ] Keyboard activation works.
- [ ] Free-text cards never navigate to a missing recipe.

### FR-4 — Edit and unlink
- [ ] Replace the recipe with another household recipe.
- [ ] Convert linked meal to free text.
- [ ] Preserve day and ordering.
- [ ] Reject cross-household recipe IDs.

### FR-5 — Recipe updates and deletion
- [ ] Live-reference versus snapshot behaviour is documented and tested.
- [ ] Deleting a recipe does not delete planned-meal history.
- [ ] Deleted recipes leave a useful meal title.
- [ ] Unavailable recipes cannot be opened.
- [ ] The planner communicates unavailable linkage without blocking use.

### FR-6 — Household isolation
- [ ] Meal cannot reference another household’s recipe.
- [ ] RLS and server validation enforce the relationship.
- [ ] Reads cannot leak foreign recipe metadata.
- [ ] Direct foreign-ID mutation tests fail safely.

## UX Requirements
- Extend quick add; do not create a large wizard.
- Keep planner card-centric and uncluttered.
- Separate card activation from drag gestures/handles.
- Progressively disclose edit/unlink/delete.
- Empty library state permits free-text planning and offers a path to create a recipe.
- Failures preserve selected day and entered text.

## Data Requirements
Use one planned-meal model supporting free-text and linked variants. It should include:
- nullable recipe reference;
- planned-meal title snapshot;
- only additional snapshot metadata that is clearly justified.

Rules:
- Recipe deletion must not cascade-delete planned meals.
- Prefer `ON DELETE SET NULL` or equivalent managed unlinking.
- Snapshot title remains after unlink/deletion.
- Same-household ownership is validated.
- Existing free-text meals migrate unchanged.
- Do not snapshot ingredients yet.

## Technical Direction
- Centralise same-household relationship validation.
- Reuse M09B recipe detail UI.
- Preserve M08B ordering and movement semantics.
- Document snapshot policy in code and tests.
- Avoid separate recipe-meal and text-meal systems unless forced by existing architecture.

## Test Plan
### Unit
Display-title resolution, link/unlink/unavailable mapping, variant validation, and click-versus-drag behaviour.

### Integration
Create linked/free-text meals, reject foreign recipe IDs, test update/deletion policy, replace/unlink without changing order, and migrate existing meals.

### End-to-end
Add linked meal, open from card, drag and reopen, convert to free text, delete recipe and verify graceful unavailable state, and test mobile flow.

## Definition of Done
- [ ] Linked and free-text meals coexist.
- [ ] Cards open recipes directly without clutter.
- [ ] Dragging remains reliable.
- [ ] Recipe deletion cannot erase meal history.
- [ ] Snapshot policy is documented/tested.
- [ ] Cross-household links are blocked.
- [ ] Preview validates add/open/move/edit/unlink/delete.
- [ ] Jira CS-20 contains PR and preview evidence.
