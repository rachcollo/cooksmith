# Engineering Package — Milestone 8B: Meal Planner UX & Drag & Drop

**Status:** Ready for Build  
**Branch:** `m08b-meal-planner-ux-drag-drop`  
**Base branch:** Latest `main`  
**Can run concurrently with:** Milestone 9B and E01  
**Depends on:** Milestone 8A — Weekly Meal Planner Foundation  
**Blocks:** Milestone 8C — Meal Planner ↔ Recipe Integration

---

## 1. Objective

Refine the weekly Meal Planner into a fast, calm, direct planning experience with reliable drag-and-drop movement, simple card interactions, and mobile- and keyboard-accessible alternatives.

This milestone improves the interaction model established in Milestone 8A. It must preserve the existing planned-meal domain, household isolation, weekly query boundary, and free-text planning capability. It does not introduce recipe selection, shopping lists, pantry deduction, or a broader planning horizon.

---

## 2. User Outcome

A signed-in household member can:

- see a clean Monday-to-Sunday weekly plan without unnecessary controls;
- add a meal directly to a day;
- click or tap a meal card to open and edit it;
- drag a meal to another day;
- reorder meals within a day where more than one meal is present;
- move, duplicate, or remove a meal without using a day-selection dropdown on the card;
- complete equivalent move actions with touch or keyboard controls;
- trust that every successful change is persisted to the shared household plan.

---

## 3. Scope

### 3.1 Simplified planner layout

Refine the existing `/plan` experience around one primary action: add a meal, then arrange it directly.

Requirements:

- retain the Monday-to-Sunday weekly view and current week navigation;
- present each day as a clear drop target;
- keep meal cards visually compact and easy to scan;
- make the complete meal card clickable or tappable to open its detail/edit interaction;
- remove any permanent “Open details” button from meal cards;
- do not add a day-selection dropdown to cards;
- avoid repeated labels, instructions, borders, and controls that make the interface feel cluttered;
- retain clear loading, empty, save-failure, and week-load failure states;
- preserve today identification without relying on colour alone.

The card may contain a separate remove or overflow action only when it remains visually quiet, has an accessible name, and does not interfere with card activation or dragging.

### 3.2 Quick add

Provide a low-friction way to add a free-text meal to a day.

Requirements:

- each day has a clear add affordance;
- the selected date is prepopulated and does not require re-entry;
- preserve meal type support from the existing domain;
- blank titles remain invalid;
- saving closes the add interaction and displays the new card without a full-page reload;
- save controls must not silently fail or leave a successful dialog open;
- repeated activation or slow network responses must not create accidental duplicate records;
- duplicate meal names remain allowed.

Do not introduce recipe search or selection in this milestone.

### 3.3 Drag meals between days

Add direct drag-and-drop movement between visible days in the displayed week.

Requirements:

- a meal card can be dragged from its current day to another visible day;
- valid drop targets are visibly identified during a drag without relying on colour alone;
- the interface provides a clear dragged-item state and insertion position;
- dropping persists the new `meal_date` through the existing repository boundary;
- meal type remains unchanged unless the user explicitly chooses to change it through the edit flow;
- dropping onto the original position is a no-op;
- a meal cannot be dropped outside the active household or displayed planner context;
- drag state is cleared after success, failure, cancellation, week navigation, or household change.

Use a maintained drag-and-drop approach compatible with the current React and TypeScript stack. Do not add a large dependency if the existing implementation can be made reliable and accessible with the current stack.

### 3.4 Reorder meals within a day

Support deterministic ordering where a day contains multiple planned meals.

Requirements:

- users can drag cards above or below other cards in the same day;
- the persisted order is stable after refresh and across household members;
- movement between days also assigns a deterministic destination position;
- concurrent or repeated moves do not create duplicate order values that result in unstable display;
- ordering is not inferred from title, creation time, or client-only array position.

If Milestone 8A does not contain a persisted order field, add an additive ordering field such as `position` or `sort_order` with a safe backfill and deterministic default. Follow existing migration, generated-type, repository, and RLS conventions.

### 3.5 Move without drag and drop

Drag and drop must not be the only way to move a meal.

Requirements:

- provide a touch- and keyboard-friendly move action through a compact contextual menu or accessible edit interaction;
- allow movement to another visible day without placing a permanent dropdown on every card;
- expose keyboard movement controls with discoverable accessible instructions;
- announce successful movement to assistive technology;
- preserve visible focus throughout the action;
- return focus to a sensible card or day target after completion.

The fallback interaction must use the same mutation logic as drag and drop so persistence and error handling do not diverge.

### 3.6 Duplicate planned meal

Allow a household member to duplicate a planned meal.

Requirements:

- duplicate copies title, meal type, and notes;
- the user can keep the same date or choose another visible date through a focused action;
- the duplicate receives a new identifier and appropriate audit values;
- a duplicate is inserted at a deterministic position;
- failure does not alter the original meal;
- the action is not shown as a permanent high-emphasis card control.

### 3.7 Remove planned meal

Retain a clear, reliable remove action.

Requirements:

- removal remains household-scoped;
- confirmation or undo-safe behaviour follows existing application patterns;
- successful removal updates the planner without a full-page reload;
- failure preserves or restores the card and displays a friendly error;
- the remove action is keyboard accessible and has an unambiguous accessible name.

### 3.8 Reliable persistence and mutation state

All planner mutations must be robust under normal network conditions.

Requirements:

- use the existing planned-meal repository rather than direct component-level Supabase calls;
- use one shared movement/reordering operation for drag, touch fallback, and keyboard actions;
- prevent conflicting mutations for the same card while a save is in flight;
- provide visible progress without blocking unrelated planner use unnecessarily;
- reconcile local state with the persisted result;
- on failure, restore the last confirmed position and show a friendly error;
- changing household or week during a request must not apply stale results to the new context;
- a page refresh must reproduce the confirmed arrangement.

For multi-row reordering, prefer an atomic database function or another transactional repository operation over a sequence of partially applied client updates.

---

## 4. Out of Scope

Do not implement:

- recipe selection or recipe links;
- recipe previews on planner cards;
- ingredient lists;
- shopping-list generation;
- pantry deduction;
- nutrition;
- recurring meals;
- meal templates;
- fortnight or month views;
- AI suggestions;
- notifications;
- realtime subscriptions unless already required by a documented project standard;
- changes to authentication, household membership, or invitation behaviour.

---

## 5. UX Requirements

- Reuse the existing Cooksmith modal, form, menu, button, card, and surface patterns.
- Keep the planner visually calm: meal cards, not controls, should dominate the experience.
- The whole meal card opens the meal interaction; do not add an “Open details” button.
- Do not display a permanent day-selection dropdown on cards.
- Use explicit drag handles only if whole-card dragging conflicts with click, tap, scrolling, or accessibility.
- Prevent touch dragging from making normal vertical page scrolling unreliable.
- Keep touch targets suitable for mobile.
- Preserve visible focus states.
- Provide accessible names for icon-only actions.
- Do not rely on colour alone for drag state, drop targets, today, errors, or selection.
- Provide reduced-motion-friendly feedback.
- On small screens, prefer a vertically stacked or horizontally scrollable day layout that keeps one day understandable at a time.
- Display dates in an Australian-friendly format while storing canonical calendar dates.

---

## 6. Technical Requirements

- Use the existing planned-meal domain, provider, repository, Supabase client, and shared validation patterns.
- Keep all queries scoped to the active household and displayed week.
- Preserve household-local calendar-date semantics; do not convert `meal_date` through UTC timestamps.
- Add only additive migrations.
- If persisted ordering is added, constrain and index it appropriately for household/date queries.
- Update generated database types after schema changes.
- Keep drag-and-drop library details outside the domain and repository contracts.
- Extract deterministic reorder calculations into testable functions.
- Make mutation functions idempotent where practical and guard against duplicate submissions.
- Do not modify recipe or Pantry domain objects.
- Do not weaken existing RLS policies or introduce service-role use in normal flows.
- Do not edit an already released migration; use a forward migration.

---

## 7. Testing Requirements

### 7.1 Unit tests

Cover:

- insertion and reorder calculations;
- moving between empty and populated days;
- same-position no-op behaviour;
- deterministic ordering after repeated moves;
- validation of any new movement/reorder input schema;
- stale mutation or household/week context guards.

### 7.2 Integration tests

Cover:

- planner renders a clean seven-day layout;
- quick add saves, closes, and shows the created meal;
- clicking the meal card opens edit details;
- no permanent “Open details” button or day dropdown is rendered;
- dragging a meal to another day persists the new date;
- reordering within a day persists the new order;
- keyboard-accessible move performs the same mutation;
- touch-friendly fallback move works without drag;
- duplicate creates an independent meal;
- remove succeeds and failure preserves the meal;
- failed movement restores the confirmed position;
- loading, empty, mutation-pending, and failure states;
- week navigation and household change clear transient drag state and reload correct data.

Use the drag library’s recommended testing approach. Do not rely only on brittle pointer-coordinate tests if the movement logic can be tested directly.

### 7.3 Database tests

Cover, where schema or database functions change:

- active household members can reorder their household meals;
- non-members cannot move or reorder another household’s meals;
- ordering fields and constraints reject invalid values;
- atomic move/reorder operations do not partially update on failure;
- existing planned-meal CRUD and household isolation remain intact.

### 7.4 Regression checks

Confirm no regression to:

- authentication;
- household switching;
- invitations and member management;
- Recipe Library navigation and behaviour;
- Pantry navigation and behaviour;
- week navigation and free-text meal editing;
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

Also run focused unit, integration, and database tests for planner movement, ordering, and mutation recovery.

If an environment limitation prevents a command from running, record the exact command, failure, and reason in the completion report. Do not describe code failures as environment limitations without evidence.

---

## 9. Manual Hosted-Preview Smoke Test

On the PR preview:

1. Sign in using the configured preview-safe authentication flow.
2. Open Meal Planner on a desktop viewport.
3. Confirm the layout is uncluttered and each meal card opens when clicked.
4. Confirm there is no permanent “Open details” button or day dropdown on cards.
5. Add two meals to one day and one meal to another day.
6. Drag a meal to an empty day and refresh to confirm persistence.
7. Reorder two meals within one day and refresh to confirm persistence.
8. Open a card and edit its title.
9. Duplicate a meal, then remove the duplicate.
10. Perform a move using keyboard controls without dragging.
11. Test the touch-friendly move alternative at a mobile viewport width.
12. Confirm normal mobile scrolling is not blocked by card interactions.
13. Navigate to another week and back.
14. Confirm Pantry, Recipes, and household navigation still work.

---

## 10. Acceptance Criteria

Milestone 8B is complete when:

- the Meal Planner presents a clean, card-led weekly experience;
- clicking or tapping a card opens it without an “Open details” button;
- users can quickly add, edit, duplicate, move, reorder, and remove meals;
- drag and drop works between days and within a day;
- an equivalent touch- and keyboard-accessible move interaction is available;
- no permanent card day-selection dropdown is present;
- confirmed movement and ordering survive refresh;
- failed mutations restore the last confirmed UI state and show an error;
- household and week isolation remain intact;
- mobile and keyboard use are supported;
- automated tests pass;
- CI passes;
- hosted-preview smoke testing passes;
- completion and handover documentation are committed.

---

## 11. Deliverables

- simplified Meal Planner layout and card interaction;
- quick-add workflow;
- drag-and-drop movement between days;
- persisted ordering and any required additive migration;
- accessible touch and keyboard movement alternative;
- duplicate and remove actions;
- shared movement/reorder repository operation;
- generated database types if the schema changes;
- unit, integration, and database tests;
- completion report;
- handover document;
- PR description with validation evidence and known limitations.

---

## 12. Concurrency Boundaries

Milestone 9B may be developed at the same time.

To minimise conflicts, this workstream must not:

- change recipe tables or recipe validation;
- add structured ingredient or instruction-step editors;
- add recipe selection to meal forms;
- change Pantry files;
- implement shopping lists;
- modify shared components unless reuse is clearly preferable and the change is backward compatible.

Likely shared-file conflicts include application providers, route tests, generated database types, global styles, and documentation indexes. Rebase or merge latest `main` before final validation if another concurrent PR merges first.
