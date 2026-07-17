# Engineering Package — Milestone 9B: Recipe Authoring & Ingredients

**Status:** Ready for Build  
**Branch:** `m09b-recipe-authoring-ingredients`  
**Base branch:** Latest `main`  
**Can run concurrently with:** Milestone 8B and E01  
**Depends on:** Milestone 9A — Recipe Library Foundation  
**Blocks:** Milestone 8C — Meal Planner ↔ Recipe Integration and future shopping-list generation

---

## 1. Objective

Turn the Recipe Library foundation into a practical household recipe-authoring experience with structured ingredients, ordered instruction steps, recipe notes, categories, tags, and favourites.

This milestone must preserve the simple library, search, detail, edit, and archive behaviours introduced in Milestone 9A while replacing unstructured ingredient and instruction text with data that Cooksmith can reliably display and later use for meal planning and shopping-list generation.

---

## 2. User Outcome

A signed-in household member can:

- create a recipe through a clear mobile-friendly form;
- add, edit, remove, and reorder structured ingredient rows;
- record an ingredient name, optional quantity, and optional unit;
- add, edit, remove, and reorder instruction steps;
- record notes, categories, and tags;
- mark or unmark a household recipe as a favourite;
- edit an existing recipe without losing data;
- view a clean recipe detail page or dialog with ingredients and numbered steps;
- trust that recipes remain private to their active household.

---

## 3. Scope

### 3.1 Structured recipe model

Extend the Milestone 9A recipe model using additive database objects.

The structured model must support:

- ordered ingredients belonging to one household recipe;
- ingredient name;
- optional quantity stored without floating-point precision loss;
- optional unit;
- optional preparation text only if needed to preserve useful author input, such as “finely chopped”;
- ordered instruction steps belonging to one household recipe;
- recipe-level notes;
- categories and free-form tags;
- household-level favourite state;
- audit timestamps and actor fields consistent with project standards.

Prefer normalized child tables for ordered ingredients and instruction steps where this supports future shopping-list work and established database conventions. Do not store the new structured model only as opaque JSON or a single formatted text field.

Use existing project conventions for UUIDs, timestamps, foreign keys, indexes, generated types, repositories, schema validation, and audit triggers.

### 3.2 Existing recipe data migration

Preserve recipes created under Milestone 9A.

Requirements:

- migration is additive and does not discard existing ingredient, instruction, source, timing, servings, or description data;
- define an explicit compatibility or backfill path for the existing unstructured ingredient and instruction fields;
- existing recipes remain viewable and editable immediately after migration;
- editing an existing recipe must not silently erase legacy content;
- once structured data is saved, the application consistently reads the structured representation;
- released migrations remain immutable; fixes use forward migrations.

If automatic parsing would be unreliable, preserve legacy text as a clearly labelled single ingredient/instruction entry or compatibility field rather than guessing at quantities and units.

### 3.3 Ingredient editor

Build a repeatable, ordered ingredient-row editor.

Each row supports:

- ingredient name, required;
- quantity, optional;
- unit, optional;
- optional preparation or qualifier text only if included in the approved model.

Requirements:

- add an ingredient row;
- edit any row in place;
- remove a row;
- reorder rows with explicit controls suitable for touch and keyboard use;
- retain entered values when another row is added or moved;
- reject rows with a blank ingredient name;
- allow common fractional input such as `1/2`, `1 1/2`, or an equivalent user-friendly representation;
- do not force a unit for countable items such as “2 eggs”;
- do not require an ingredient to exist in Pantry;
- preserve the author’s display wording while storing any normalized quantity separately;
- provide field-level validation and a clear recipe-level save error.

Do not introduce an exhaustive global unit-management system in this milestone. A concise set of common Australian cooking units plus optional free-text handling is acceptable when implemented safely.

### 3.4 Instruction-step editor

Build an ordered instruction editor.

Requirements:

- add multiple instruction steps;
- edit steps in place;
- remove steps;
- reorder steps with touch- and keyboard-accessible controls;
- display steps as an automatically numbered sequence;
- reject blank saved steps;
- renumber automatically after add, remove, or reorder;
- preserve multiline text where useful;
- do not require users to manually enter step numbers.

### 3.5 Recipe metadata

Support practical recipe metadata without turning authoring into a long administrative form.

Requirements:

- retain existing name, description, servings, preparation time, cooking time, and source fields where already present;
- add optional recipe notes;
- support one or more categories from a concise product-approved set or the repository’s established category convention;
- support optional free-form tags with normalization for trimming, duplicate prevention, and safe length limits;
- allow favourite state to be toggled from the authoring flow and from a low-friction library/detail action;
- make required and optional fields clear;
- keep less common metadata visually secondary to name, ingredients, and instructions.

Category and tag search/filtering may be included where it fits the existing library cleanly, but a complex taxonomy-management interface is not required.

### 3.6 Create and edit experience

Refine recipe creation and editing into a mobile-suitable flow.

Requirements:

- the form order prioritises recipe name, ingredients, and instructions;
- current values are prepopulated when editing;
- cancel discards unsaved changes after confirmation when material edits exist;
- save creates or updates the recipe and all structured child data consistently;
- save closes or exits the authoring interaction on success and shows the updated recipe;
- save cannot silently succeed while leaving stale data visible;
- repeated activation or slow responses do not create duplicate recipes, ingredients, or steps;
- partial child-row failure must not leave a recipe in a misleading half-saved state;
- repository and schema failures use friendly, actionable messages;
- archived recipes remain governed by the Milestone 9A lifecycle decision.

Prefer a transactional database function or equivalent atomic repository operation for saving a recipe together with its ordered child records.

### 3.7 Recipe detail presentation

Update recipe detail display for structured content.

Requirements:

- the whole recipe card remains clickable or tappable to open details;
- do not add a permanent “Open details” button to cards;
- display ingredient rows in authored order with readable quantity and unit formatting;
- display instructions as ordered numbered steps;
- show notes, categories, tags, servings, timing, and source only when present;
- favourite state is clear without overwhelming the card or detail view;
- source URLs remain validated and safely rendered;
- recipe text is rendered as plain content, not raw HTML.

### 3.8 Household permissions and RLS

Extend row-level security consistently across all new recipe objects.

Requirements:

- active household members may read and mutate structured recipe content for their household;
- child records derive or validate household ownership through their parent recipe;
- users cannot attach ingredient or step rows to a recipe in another household;
- users cannot read or mutate another household’s recipes, ingredients, steps, tags, categories, or favourite state;
- normal application flows do not depend on service-role credentials;
- database tests cover parent-child household isolation and mutation rules.

---

## 4. Out of Scope

Do not implement:

- Meal Planner integration or “add to plan” actions;
- shopping-list generation;
- Pantry matching or deduction;
- automated recipe importing from URLs, photos, documents, or external services;
- AI parsing or recipe generation;
- nutrition calculation;
- ingredient substitution suggestions;
- recipe scaling or automatic unit conversion;
- public recipe sharing;
- image upload unless already approved in another milestone;
- collaborative realtime editing;
- advanced category or tag administration.

---

## 5. UX Requirements

- Reuse existing Cooksmith form, modal, card, button, input, and surface patterns.
- Keep the authoring flow calm and linear, with name, ingredients, and instructions as the dominant sections.
- Avoid placing every optional metadata field at equal visual prominence.
- Keep touch targets suitable for mobile.
- Support adding, removing, and reordering rows without precision dragging.
- Ensure all row actions have accessible names that include the affected ingredient or step where possible.
- Preserve visible focus after add, remove, and reorder operations.
- Announce meaningful reorder results to assistive technology.
- Do not rely on colour alone for favourite state, validation, required fields, or errors.
- Keep unsaved typed content stable while users manipulate other rows.
- Use Australian-friendly labels and common metric cooking units.
- Provide useful empty guidance for a new recipe without filling the form with placeholder content.

---

## 6. Technical Requirements

- Use the existing recipe provider, repository, Supabase client, domain types, and shared validation pattern.
- Extend the repository contract around aggregate recipe reads and atomic create/update operations.
- Avoid direct Supabase calls from form components.
- Use additive forward migrations only.
- Add appropriate foreign keys, cascade/archive behaviour, constraints, and indexes for recipe child records.
- Use exact numeric or safe text-plus-normalized representations for quantities; do not use binary floating point for persisted cooking quantities.
- Define stable sort positions for ingredients and steps.
- Validate and normalize tags consistently in both application and database layers where appropriate.
- Regenerate database types after schema changes.
- Preserve existing Recipe Library search and archive behaviour.
- Keep household scoping explicit in repository operations and enforced by RLS.
- Do not modify planned-meal or Pantry domain objects.
- Do not introduce a service-role dependency in normal application flows.
- Keep the design compatible with future shopping-list aggregation without implementing that feature now.

---

## 7. Testing Requirements

### 7.1 Unit tests

Cover:

- ingredient-row validation;
- supported quantity formats and invalid quantities;
- optional unit behaviour;
- instruction-step validation;
- ingredient and instruction reorder calculations;
- tag trimming, duplicate prevention, and limits;
- recipe aggregate validation;
- formatting of quantities and units for display;
- legacy recipe compatibility mapping.

### 7.2 Integration tests

Cover:

- create a recipe with multiple structured ingredients and instructions;
- add, edit, remove, and reorder ingredient rows;
- add, edit, remove, and reorder instruction steps;
- optional notes, category, tags, and favourite state;
- save closes the form and displays current structured data;
- edit prepopulates all current data;
- cancel preserves the persisted recipe;
- failed or partial save does not show misleading success;
- repeated save activation does not duplicate child records;
- existing Milestone 9A recipe data remains viewable and editable;
- recipe card click opens details without an “Open details” button;
- loading, empty, validation, and repository failure states;
- active-household changes refresh and isolate recipe data.

### 7.3 Database tests

Cover:

- recipe ingredient and instruction tables, constraints, and foreign keys;
- deterministic ordering constraints;
- valid and invalid quantity persistence;
- active household members can read and mutate their household recipe aggregate;
- non-members cannot read or mutate another household’s child records;
- cross-household parent-child attachment is rejected;
- atomic create/update rolls back the whole aggregate on failure;
- archive and deletion behaviour does not orphan child data;
- existing recipe records survive migration and compatibility handling.

### 7.4 Regression checks

Confirm no regression to:

- authentication;
- household switching;
- invitations and member management;
- Recipe Library list, search, detail, edit, and archive flows;
- Meal Planner navigation and behaviour;
- Pantry navigation and behaviour;
- primary application navigation on desktop and mobile.

---

## 8. Validation Commands

Run the repository-standard validation suite, including at minimum:

```bash
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:config:check
npm run db:validate
```

Also run focused unit, integration, and database tests for recipe aggregates, structured ingredient and instruction editing, migration compatibility, RLS, and transaction rollback.

If an environment limitation prevents a command from running, record the exact command, failure, and reason in the completion report. Do not describe code failures as environment limitations without evidence.

---

## 9. Manual Hosted-Preview Smoke Test

On the PR preview:

1. Sign in using the configured preview-safe authentication flow.
2. Open Recipes and create a new recipe.
3. Add at least four ingredients using different quantity and unit combinations, including one without a unit.
4. Reorder, edit, and remove ingredient rows.
5. Add at least three instruction steps, then reorder and edit them.
6. Add notes, a category, tags, servings, timing, and a source URL.
7. Mark the recipe as a favourite and save.
8. Confirm the authoring interaction closes and the saved recipe opens or appears correctly.
9. Refresh and confirm ingredient and instruction order persists.
10. Edit the recipe, cancel, and confirm persisted values are unchanged.
11. Open a recipe created under Milestone 9A and confirm its legacy content is preserved.
12. Confirm the whole recipe card opens details and there is no “Open details” button.
13. Archive a test recipe and confirm existing archive behaviour still works.
14. Confirm Meal Planner, Pantry, and household navigation still work.
15. Repeat the core create/edit flow at a mobile viewport width and with keyboard-only navigation.

---

## 10. Acceptance Criteria

Milestone 9B is complete when:

- recipes support persisted ordered ingredient rows and instruction steps;
- ingredients support a required name and optional quantity and unit;
- users can add, edit, remove, and reorder ingredients and steps;
- notes, categories, tags, and favourite state are supported;
- recipe create and edit are usable on mobile and by keyboard;
- save is atomic and cannot leave misleading partial data;
- existing Milestone 9A recipes remain viewable and editable without data loss;
- recipe detail presents structured content clearly;
- the whole recipe card opens details without an “Open details” button;
- all recipe data remains household-isolated through RLS;
- automated tests pass;
- CI passes;
- hosted-preview smoke testing passes;
- completion and handover documentation are committed.

---

## 11. Deliverables

- additive recipe-structure migration(s);
- safe legacy recipe compatibility or backfill path;
- generated database types;
- structured recipe domain types and validation schemas;
- aggregate recipe repository create/update/read operations;
- ingredient-row editor;
- ordered instruction-step editor;
- notes, categories, tags, and favourite controls;
- updated recipe detail presentation;
- unit, integration, and database tests;
- completion report;
- handover document;
- PR description with validation evidence and known limitations.

---

## 12. Concurrency Boundaries

Milestone 8B may be developed at the same time.

To minimise conflicts, this workstream must not:

- modify planned-meal tables, ordering, or drag-and-drop behaviour;
- add recipe selection to the Meal Planner;
- add meal-plan actions to recipe cards;
- change Pantry files;
- implement shopping-list generation;
- modify shared components unless reuse is clearly preferable and the change is backward compatible.

Likely shared-file conflicts include application providers, generated database types, global styles, test render helpers, and documentation indexes. Rebase or merge latest `main` before final validation if another concurrent PR merges first.
