# Engineering Package — CS-27: Multiline Recipe Authoring

**Status:** Ready for Build  
**Branch:** `cs27-multiline-recipe-authoring`  
**Base branch:** Latest `main`  
**Delivery pairing:** Build and validate with CS-28  
**Depends on:** CS-19 / Milestone 9B  
**Blocks:** CS-20 and CS-30

---

## 1. Objective

Replace row-by-row recipe entry with two fast, forgiving multiline fields: one for ingredients and one for instructions. Busy families must be able to type or paste a recipe in one pass while Cooksmith retains the ordered content needed by recipe detail and future features.

## 2. User Outcome

A household member can create or edit a recipe by pasting or typing:

- one ingredient per line in a single Ingredients field;
- instructions as natural multiline text in a single Instructions field;
- optional blank lines while drafting, without managing individual row controls;
- the rest of the existing recipe metadata without losing favourites, categories, tags, notes, source, or household isolation.

Saving is atomic. Reopening the recipe reproduces the authored text faithfully, and recipe detail remains easy to scan.

## 3. Scope

### 3.1 Authoring interaction

- Replace ingredient row controls with a labelled multiline textarea.
- Replace instruction-step row controls with a labelled multiline textarea.
- Support paste, undo, select-all, mobile keyboards, and normal newline entry.
- Preserve line order and meaningful user-entered text.
- Do not require quantities, units, names, or step numbers to be entered separately.
- Provide concise examples in helper text; do not turn the form into a tutorial.
- Keep existing metadata and favourite behaviour.
- Warn before discarding unsaved changes using the established pattern.
- Keep create and edit flows consistent.

### 3.2 Presentation and compatibility

- Recipe detail may render non-empty ingredient lines as a readable list.
- Instructions may render as ordered steps derived by CS-28.
- Existing CS-19 structured recipes must load without data loss.
- On first edit, convert existing structured records to clear multiline text deterministically.
- Do not silently overwrite legacy content until the user saves.
- Retain compatibility labels only where ambiguity genuinely remains.

### 3.3 Persistence

- Treat the authored multiline text as the lossless source of truth.
- Save source text and derived ordered content in one transaction.
- Preserve raw line text, punctuation, fractions, Unicode, and ordering.
- Use additive forward migrations only; do not edit released migrations.
- Update generated database types, domain models, validation, and repository mappings.
- Maintain household RLS and existing archive behaviour.

## 4. Out of Scope

- URL import (CS-30);
- AI-generated or AI-rewritten recipes;
- mandatory ingredient normalization;
- shopping-list generation or Pantry deduction;
- Cook With Me mode (CS-29);
- meal-plan integration (CS-20);
- public sharing or nutrition calculations.

## 5. UX and Accessibility Requirements

- Optimise the default path for paste-first authoring.
- Use generous textarea height with sensible mobile resizing.
- Keep labels visible; placeholders are not labels.
- Preserve visible focus, error association, keyboard order, and touch-friendly controls.
- Do not create one control per line while typing.
- Validation errors must explain what the user can do next.
- Announce save success and failure where appropriate.
- Test long recipes and narrow screens without horizontal overflow.

## 6. Technical Requirements

- Follow the existing recipe provider/repository boundaries.
- Integrate with the CS-28 parser through a small deterministic domain interface.
- Avoid parsing on every keystroke if it creates visible latency; parse on save or through a debounced preview.
- Keep source text recoverable even when derivation fails.
- Prevent duplicate saves on repeated activation.
- Apply stale-request protection when household or recipe context changes.
- Render recipe content as plain text; do not inject authored HTML.
- Preserve atomicity across the recipe aggregate.

## 7. Testing Requirements

### Unit

- multiline validation and normalization boundaries;
- structured-to-multiline compatibility mapping;
- preservation of order, punctuation, Unicode, fractions, and blank-line intent;
- discard-warning dirty-state behaviour;
- save payload includes source and derived content.

### Integration

- create by typing and by pasting both fields;
- edit and reopen with faithful text;
- existing CS-19 recipe migration path;
- atomic failure does not partially update the aggregate;
- duplicate activation does not duplicate content;
- mobile and keyboard-only flows;
- favourite, category, tag, notes, source, archive, and household switching regressions.

### Database

- source text fields and derived child rows remain household isolated;
- aggregate save is atomic;
- existing recipes remain readable after migration;
- cross-household reads and writes are rejected.

## 8. Validation

Run the repository-standard format, lint, typecheck, test, build, database configuration, migration, generated-type, and RLS suites. Record exact environmental limitations rather than marking unrun checks as passed.

On the hosted preview, paste a long real-world recipe, save it, reopen it, edit it on a mobile viewport, and confirm no text or ordering is lost.

## 9. Acceptance Criteria

CS-27 is complete when:

- ingredients and instructions are each authored in one multiline field;
- a user can paste a full recipe without adding rows individually;
- existing structured recipes remain usable and editable;
- authored text round-trips without loss;
- derived display content is saved atomically through CS-28;
- mobile, keyboard, validation, and discard flows are accessible;
- automated checks, database checks, CI, and hosted-preview testing pass;
- completion and handover notes are committed.

## 10. Deliverables

- multiline create/edit UI;
- compatibility mapping for CS-19 data;
- updated domain, validation, repository, and database contracts;
- focused unit, integration, database, and accessibility tests;
- completion report and handover evidence.

## 11. Concurrency Boundaries

Build CS-27 and CS-28 as one coordinated slice or tightly sequenced PRs. CS-20 and CS-30 should branch only after their shared recipe contract is merged. Do not modify Meal Planner or Pantry behaviour in this package.
