# Engineering Package — Milestone 8C: Meal Planner ↔ Recipe Integration

**Status:** Ready for Build after dependencies merge  
**Branch:** `m08c-meal-planner-recipe-integration`  
**Base branch:** Latest `main`  
**Can run concurrently with:** E01 only after dependency verification  
**Depends on:** Milestones 8A, 8B, 9A, and 9B  
**Blocks:** Future shopping-list generation from planned meals

---

## 1. Objective

Connect the household Recipe Library to the weekly Meal Planner so a planned meal can reference a household recipe while Cooksmith continues to support useful free-text meals.

This milestone establishes a reliable link between planning and recipe data, makes linked recipes easy to recognise and open, and defines safe behaviour when a recipe is edited, archived, or deleted. It does not generate shopping lists, deduct Pantry items, calculate nutrition, or remove free-text planning.

---

## 2. User Outcome

A signed-in household member can:

- add a household recipe to a day in the Meal Planner;
- still add a free-text meal when no recipe is needed;
- identify when a planned meal is linked to a recipe;
- click or tap a linked meal card to open the recipe;
- move, reorder, duplicate, edit, or remove a linked planned meal using the established planner interactions;
- see recipe edits reflected appropriately without losing the historical meal title;
- trust that recipes and plans cannot be linked across households.

---

## 3. Scope

### 3.1 Planned-meal recipe reference

Extend the planned-meal model with an optional reference to a household recipe.

Requirements:

- add a nullable `recipe_id` or equivalent foreign key to planned meals;
- free-text planned meals remain valid with no recipe reference;
- a linked planned meal and recipe must belong to the same household;
- preserve the planned meal’s title as a snapshot of what was planned;
- retain existing meal date, meal type, notes, ordering, audit, and household fields;
- index the relationship for displayed-week queries;
- update generated database types and repository mappings;
- use an additive forward migration only.

The household match must be enforced by the database, not only by the UI. Prefer a composite constraint, validated database function, trigger, or another established pattern that cannot be bypassed by a direct client request.

### 3.2 Link lifecycle and snapshot behaviour

Define deterministic behaviour when recipe data changes.

Requirements:

- when a recipe is selected, copy its current name into the planned meal title snapshot;
- when a linked recipe is renamed, the planner may display the current recipe name as primary information, but must retain the planned-meal title snapshot for historical and fallback use;
- recipe ingredient or instruction edits are visible when the linked recipe is opened and do not require updating planned-meal rows;
- archiving a recipe does not corrupt or remove existing planned meals;
- archived recipes are excluded from new selection by default;
- an existing planned meal linked to an archived recipe remains understandable and can display an unobtrusive unavailable/archived state;
- if physical recipe deletion is ever permitted, use safe foreign-key behaviour such as `ON DELETE SET NULL` and retain the planned-meal title snapshot;
- unlinking a recipe converts the entry to a free-text meal and preserves an editable title;
- no recipe mutation should cascade-delete planned meals.

Document the final lifecycle decision in the migration, domain code, tests, completion report, and handover.

### 3.3 Add a recipe to the Meal Planner

Extend the existing quick-add interaction without making simple planning slower.

Requirements:

- allow the user to choose between selecting a household recipe and entering a free-text meal;
- default to a simple, low-friction interaction rather than a large form;
- recipe selection searches or filters only active recipes in the active household;
- selection displays enough information to distinguish similar recipes without loading full ingredient data for every result;
- the selected day and meal type remain prepopulated;
- selecting a recipe prepopulates the planned meal title snapshot;
- saving closes the interaction and displays the linked meal card without a full-page reload;
- blank free-text titles remain invalid;
- repeated activation or slow network responses do not create duplicate planned meals.

Do not add a permanent recipe dropdown to every meal card.

### 3.4 Add a recipe from the Recipe Library

Provide a focused path from a recipe to the planner if it can be added without cluttering the library.

Requirements:

- a recipe detail interaction may expose a clear “Add to meal plan” action;
- the user chooses a date and meal type before save;
- default the date to today or the currently relevant planner date only when that context is reliable;
- saving creates the same planned-meal structure as adding from the planner;
- the action is secondary to reading and editing the recipe;
- recipe cards remain clickable to open details and do not gain several permanent action buttons.

If this path materially complicates the Recipe Library UI, prioritise recipe selection from the Meal Planner and record the library-origin action as a known limitation. The planner-origin flow is mandatory.

### 3.5 Linked planner-card presentation

Display linked recipes clearly within the simplified Milestone 8B card design.

Requirements:

- preserve the compact card-led planner layout;
- indicate a recipe link with concise text or an icon plus accessible name;
- use the current recipe name when available and the planned title snapshot as fallback;
- optionally show concise recipe metadata such as favourite state or total time only when it improves scanning and does not clutter cards;
- do not render full ingredient lists or instruction steps on planner cards;
- clicking or tapping a linked card opens recipe detail directly or through one clear detail interaction;
- free-text cards continue to open the planned-meal edit interaction;
- provide an accessible way to edit planned-meal-specific fields for a linked card without making the primary card action ambiguous;
- archived or unavailable recipes display a calm fallback state and retain normal move/remove capability.

Do not add an “Open details” button or permanent day-selection dropdown to cards.

### 3.6 Open recipe from the planner

Users must be able to move from planning to cooking information without losing context.

Requirements:

- opening a linked card shows the existing Recipe detail experience with structured ingredients and instructions;
- browser back, close, or equivalent returns the user to the same displayed planner week;
- direct URLs or route state follow existing routing conventions;
- unavailable, archived, or deleted recipe states do not produce a blank or broken dialog;
- recipe text remains rendered safely as plain content and source links retain validation.

### 3.7 Edit, move, duplicate, unlink, and remove

Linked meals must remain compatible with Milestone 8B interactions.

Requirements:

- drag, keyboard move, touch fallback move, and reorder preserve `recipe_id`;
- duplicating a linked meal preserves the recipe reference and current title snapshot;
- editing the date, meal type, and planned-meal notes does not alter the recipe;
- changing to another recipe validates household ownership and refreshes the snapshot title;
- unlinking preserves an editable free-text title and does not change or archive the recipe;
- removing a planned meal does not remove or archive the recipe;
- archiving a recipe does not remove the planned meal;
- every action uses the existing planned-meal repository and mutation recovery behaviour.

### 3.8 Query and repository behaviour

Keep week loading efficient and predictable.

Requirements:

- query only the active household and displayed week;
- return sufficient linked-recipe summary data to render cards without an N+1 request per meal;
- do not load full ingredients and steps for every planned meal during week rendering;
- fetch full recipe detail only when opened, unless already available in an appropriate cache;
- repository results distinguish free-text, active linked, archived linked, and unavailable linked meals;
- household or week changes cannot apply stale linked-recipe results to the new context;
- errors in optional recipe summary loading do not hide otherwise valid planned meals.

### 3.9 Household permissions and RLS

Enforce the integration boundary in the database.

Requirements:

- active household members can link their household’s recipes to their household’s planned meals;
- non-members cannot discover or link recipes from another household;
- a recipe from household A cannot be attached to a planned meal in household B, even with a known UUID;
- update and unlink operations remain constrained by active household membership;
- recipe and planned-meal RLS policies remain intact;
- normal application flows do not use service-role credentials;
- database tests cover cross-household link attempts and lifecycle behaviour.

---

## 4. Out of Scope

Do not implement:

- shopping-list generation;
- ingredient aggregation across planned meals;
- Pantry matching, deduction, or reconciliation;
- nutrition calculations;
- recipe scaling based on household size;
- automatic serving adjustment;
- AI meal suggestions;
- automated recipe importing;
- recurring meals or meal templates;
- public recipe sharing;
- realtime subscriptions unless already required by a documented project standard;
- fortnight or month planner views.

---

## 5. UX Requirements

- Preserve the calm, direct Meal Planner established in Milestone 8B.
- Keep free-text add as a first-class option; do not force every meal to be a recipe.
- Do not place recipe or day dropdowns permanently on cards.
- The whole linked card should open the recipe; do not add an “Open details” button.
- Provide a clear but visually secondary route to edit planned-meal-specific fields.
- Keep recipe selection searchable and usable with a small household library or a larger one.
- Use touch targets suitable for mobile.
- Ensure full keyboard access to selection, opening, editing, unlinking, and planner movement.
- Preserve visible focus and return it sensibly when a recipe dialog closes.
- Do not rely on colour alone to identify linked, archived, unavailable, selected, or error states.
- Announce save, link, unlink, and failure outcomes where appropriate.
- Avoid exposing ingredient or recipe data from another household in search suggestions, errors, or loading states.

---

## 6. Technical Requirements

- Use the existing planned-meal and recipe providers, repositories, Supabase client, and shared validation patterns.
- Keep domain relationships explicit; do not infer links from matching titles.
- Preserve a nullable recipe reference and a planned-title snapshot.
- Enforce same-household linking at the database layer.
- Use additive forward migrations only and do not edit released Milestone 8A or 9A migrations.
- Update generated database types after schema changes.
- Extend planned-meal validation to accept a nullable recipe identifier safely.
- Keep calendar dates as household-local dates, not UTC timestamps.
- Preserve stable ordering during link, move, and duplicate operations.
- Avoid N+1 week rendering queries and avoid loading recipe aggregates until needed.
- Reuse the established Recipe detail renderer rather than duplicating ingredient and instruction UI inside the planner.
- Keep error messages friendly while avoiding confirmation of inaccessible recipe identifiers.
- Do not modify Pantry objects or implement shopping-list logic.
- Do not introduce service-role use in normal application flows.

---

## 7. Testing Requirements

### 7.1 Unit tests

Cover:

- planned-meal validation with and without a recipe ID;
- snapshot-title creation when linking or changing recipes;
- mapping of free-text, active linked, archived linked, and unavailable linked states;
- unlink behaviour and fallback title selection;
- duplicate and move operations preserve the link;
- linked-recipe summary mapping without full aggregate loading.

### 7.2 Integration tests

Cover:

- add an active household recipe from the Meal Planner;
- add a free-text meal through the same quick-add experience;
- recipe selection excludes other households and archived recipes;
- linked card displays recipe state and opens structured recipe detail;
- closing or navigating back returns to the same planner week;
- free-text card still opens planned-meal edit;
- linked meal date/type edit does not change the recipe;
- drag, keyboard move, touch fallback, and reorder preserve the recipe link;
- duplicate preserves the link and creates an independent planned meal;
- change linked recipe updates the snapshot;
- unlink converts to free text without changing the recipe;
- remove planned meal leaves the recipe intact;
- renamed recipe displays current information with snapshot fallback;
- archived or unavailable recipe leaves an understandable, usable planner card;
- week rendering does not make one full recipe request per meal;
- loading, empty, save, stale-context, and repository failure states.

### 7.3 Database tests

Cover:

- optional recipe foreign key and intended delete behaviour;
- active household members can link recipes and meals in their household;
- non-members cannot create, update, or inspect links in another household;
- cross-household recipe linking is rejected even when both identifiers are valid;
- free-text planned meals remain valid;
- recipe archive preserves existing links and planned-meal snapshots;
- physical deletion, if supported, nulls the link without deleting the planned meal;
- moving, reordering, duplicating, or unlinking retains household isolation;
- existing Milestone 8A planned meals remain valid after migration.

### 7.4 Regression checks

Confirm no regression to:

- authentication;
- household switching;
- invitations and member management;
- Meal Planner quick add, edit, drag, reorder, duplicate, and remove;
- Recipe Library list, search, authoring, detail, favourite, and archive flows;
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

Also run focused unit, integration, and database tests for link creation, same-household enforcement, lifecycle behaviour, planner movement, recipe opening, query efficiency, and free-text compatibility.

If an environment limitation prevents a command from running, record the exact command, failure, and reason in the completion report. Do not describe code failures as environment limitations without evidence.

---

## 9. Manual Hosted-Preview Smoke Test

On the PR preview:

1. Sign in using the configured preview-safe authentication flow.
2. Create or confirm an active household recipe with structured ingredients and steps.
3. Open Meal Planner and add that recipe to a day.
4. Confirm save closes the interaction and the linked card appears.
5. Click the linked card and confirm the recipe opens with ingredients and instructions.
6. Close it and confirm the same planner week and position are retained.
7. Add a free-text meal and confirm it remains fully supported.
8. Drag the linked meal to another day, refresh, and confirm the link remains.
9. Move it using the keyboard or touch fallback and confirm the link remains.
10. Duplicate the linked meal and confirm both cards open the recipe.
11. Rename the recipe and confirm the planner presents the intended current-name/snapshot behaviour.
12. Archive the recipe and confirm the existing planned meal remains understandable and movable.
13. Unlink one planned meal and confirm it becomes editable free text without changing the recipe.
14. Remove a linked planned meal and confirm the recipe remains in the library or archived state.
15. Switch households and confirm no recipes or linked meal data leak across households.
16. Confirm Pantry and primary navigation still work.
17. Repeat the core add/open/move flow at desktop and mobile widths and with keyboard-only navigation.

---

## 10. Acceptance Criteria

Milestone 8C is complete when:

- planned meals can optionally reference a recipe in the same household;
- free-text planned meals remain fully supported;
- same-household linkage is enforced by the database and RLS;
- users can select an active household recipe when planning a meal;
- linked cards are concise, recognisable, and open recipe details when clicked or tapped;
- linked meals remain compatible with drag, move, reorder, duplicate, edit, unlink, and remove actions;
- recipe edits, archive, and deletion behaviour follow the documented lifecycle decision;
- planned-title snapshots preserve useful fallback and historical information;
- week loading avoids N+1 full-recipe requests;
- existing planned meals and recipes migrate without data loss;
- mobile and keyboard use are supported;
- automated tests pass;
- CI passes;
- hosted-preview smoke testing passes;
- completion and handover documentation are committed.

---

## 11. Deliverables

- additive planned-meal recipe-link migration;
- database-enforced same-household relationship and lifecycle behaviour;
- generated database types;
- extended planned-meal domain types and validation;
- linked-recipe summary repository/query support;
- planner recipe-selection and free-text quick-add flow;
- linked planner-card presentation;
- recipe-detail opening from the planner;
- link, change, unlink, move, duplicate, and remove workflows;
- optional “Add to meal plan” recipe-detail action if it remains clean and in scope;
- unit, integration, and database tests;
- completion report;
- handover document;
- PR description with validation evidence, lifecycle decision, query approach, and known limitations.

---

## 12. Concurrency Boundaries

This milestone integrates the Meal Planner and Recipe Library and should begin only after Milestones 8B and 9B are accepted and merged.

To minimise conflicts, this workstream must not:

- redesign the Meal Planner interaction model established in Milestone 8B;
- redesign structured recipe authoring established in Milestone 9B;
- implement shopping-list generation or ingredient aggregation;
- modify Pantry files or add Pantry deduction;
- add AI, imports, nutrition, or public sharing;
- modify shared components unless reuse is clearly preferable and the change is backward compatible.

Likely shared-file conflicts include planned-meal and recipe repositories, providers, generated database types, route/dialog state, integration test harnesses, global styles, and documentation indexes. Rebase or merge latest `main` before starting and again before final validation if another PR merges during delivery.
