# M09B — Recipe Authoring & Ingredients

## Metadata
- **Milestone:** `M09B`
- **Jira issue:** `CS-19`
- **Epic:** `Recipe Library (CS-5)`
- **Status:** `Ready`
- **Branch:** `feat/cs-19-recipe-authoring`
- **Depends on:** `CS-16 / M09A`
- **Blocks:** `CS-20 / M08C`
- **Package path:** `engineering/ready/m09b-recipe-authoring-ingredients.md`

## Product Outcome
Households can create recipes useful for real cooking, with structured ingredients, ordered instructions, notes, lightweight organisation, and favourites through a clean mobile-friendly editor.

This completes standalone recipe authoring. It excludes automatic importing, planner integration, shopping generation, and nutrition.

## Current Baseline
Begin from current `main`. M09A already provides household recipe storage and create/view/edit/delete behaviour. Inspect the real schema, forms, permissions, and tests before editing. Extend the existing recipe model; do not create a second recipe system.

## Scope
### Included
- Structured ingredient rows: name, optional quantity, optional unit.
- Ordered instruction steps.
- Notes.
- Lightweight categories/tags.
- Favourite/unfavourite.
- Create/edit validation and recoverable save behaviour.
- Responsive authoring and readable recipe detail.
- Household isolation and automated coverage.

### Explicitly Out of Scope
- Meal-planner integration.
- Shopping-list generation.
- URL/photo import or OCR.
- Nutrition calculation.
- Public sharing.
- Complex taxonomy administration.
- Canonical pantry ingredient matching.

## Functional Requirements

### FR-1 — Structured ingredients
- [ ] Add, edit, remove, and reorder ingredient rows.
- [ ] Ingredient name is required for any non-empty row.
- [ ] Quantity and unit may be omitted.
- [ ] Empty trailing rows are ignored.
- [ ] Order remains stable after save/refresh.
- [ ] Existing M09A recipes remain readable and editable.

### FR-2 — Ordered instructions
- [ ] Add, edit, remove, and reorder steps.
- [ ] Empty steps are not persisted.
- [ ] Order survives refresh.
- [ ] Detail view renders a readable numbered sequence.
- [ ] Editing never silently discards steps.

### FR-3 — Notes, categories, and tags
- [ ] Optional notes can be saved.
- [ ] Simple categories/tags can be assigned.
- [ ] Obvious duplicate tags are prevented by normalised comparison.
- [ ] No category administration is required before saving.
- [ ] Metadata remains household-scoped.

### FR-4 — Favourites
- [ ] Favourite state can be toggled from an appropriate recipe surface.
- [ ] State persists after refresh.
- [ ] Favourites are visually distinguishable without clutter.
- [ ] A user cannot favourite a recipe from another household.

### FR-5 — Validation and recovery
- [ ] Title is required.
- [ ] Messages identify the relevant field or row.
- [ ] Double submission is prevented.
- [ ] Successful save closes or clearly confirms save.
- [ ] Failed save retains entered content.
- [ ] Dirty-form navigation follows the existing project convention.

### FR-6 — Recipe detail
- [ ] Title, ingredients, instructions, notes, tags/categories, and favourite render correctly.
- [ ] Mobile layout is practical while cooking.
- [ ] Missing optional sections do not create empty headings.
- [ ] Edit/delete remain available without clutter.
- [ ] Clicking the recipe card opens details; no permanent “Open details” button.

### FR-7 — Household isolation
- [ ] Child records cannot be read or changed across households.
- [ ] Child records cannot attach to another household’s recipe.
- [ ] RLS and application-level negative tests are included.

## UX Requirements
- Use clear sections: essentials, ingredients, instructions, optional details.
- Mobile add/reorder must not depend on precise drag gestures.
- Provide explicit add-row controls and keyboard-operable reorder alternatives.
- Do not force quantities into an overly strict numeric format.
- Save/cancel/destructive behaviour must match Cooksmith.
- Dialog/sheet closes only after confirmed successful save.
- Validate at save time while allowing incomplete intermediate editing.

## Data Requirements
Extend the existing recipe model using current relational conventions. Likely concepts include recipe ingredients, instruction steps, tags/categories, and favourite state.

Rules:
- Explicit ingredient and step order.
- Child ownership validated through the parent recipe.
- Safe child cleanup on recipe deletion.
- Migration-safe compatibility for existing recipes.
- Quantities support human-entered values such as fractions or ranges.
- Tag normalisation prevents obvious duplicates while preserving display text.
- Every new table/field is protected by RLS.

## Technical Direction
- Prefer atomic recipe saves so child updates cannot leave partial recipes.
- Reuse current mutation/server patterns.
- Keep form-to-domain mapping testable.
- Avoid a rich-text editor.
- Avoid canonical ingredient infrastructure in this milestone.
- Avoid coupling schema prematurely to shopping-list generation.

## Test Plan
### Unit
Form mapping, empty-row filtering, tag normalisation, validation, and reorder helpers.

### Integration
Create/edit a complete recipe, reorder children, delete with cleanup, migrate an M09A recipe, and reject cross-household access.

### End-to-end
Create, open via card, edit, favourite, validation failure/recovery, delete, and mobile-width critical flow.

## Definition of Done
- [ ] Structured ingredients/instructions persist with stable order.
- [ ] Existing recipes remain compatible.
- [ ] Save and close behaviour is reliable.
- [ ] Recipe cards open details directly.
- [ ] Mobile authoring is practical.
- [ ] Authorization tests pass.
- [ ] Hosted preview validates create/edit/favourite/delete.
- [ ] Jira CS-19 contains PR and preview evidence.
