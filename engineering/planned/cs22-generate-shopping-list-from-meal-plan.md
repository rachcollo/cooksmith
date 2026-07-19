# Engineering Package — CS-22: Generate Shopping List from Meal Plan

## Metadata

- **Milestone:** M10B
- **Title:** Generate Shopping List from Meal Plan
- **Jira issue:** CS-22
- **Epic:** Shopping Lists (CS-6)
- **Status:** Planned
- **Branch:** `feat/cs-22-generate-shopping-list`
- **Depends on:** CS-20, CS-21 and reliable linked-recipe saves from the meal planner
- **Blocks:** CS-23 and CS-25
- **Package path:** `engineering/planned/cs22-generate-shopping-list-from-meal-plan.md`

## Product Outcome

When a household member adds a recipe-based dinner to the meal planner, Cooksmith automatically adds that recipe's ingredients to the household's current shopping list. The result is useful without extra form-filling, remains safe to retry, and keeps the user's manual shopping-list decisions intact.

Free-text dinners continue to work but do not generate shopping items because they have no recipe ingredients. Generation must never make saving a planned meal appear successful when the linked recipe or ingredient reconciliation failed.

## Current Baseline

- `planned_meals` supports an optional same-household `recipe_id` and retains a title snapshot.
- Recipe content preserves raw multiline ingredients and derives ordered ingredient records with original-line provenance and parser metadata.
- Each active household has one active `shopping_lists` container and household-scoped `shopping_list_items` supporting add, edit, complete, restore and remove.
- Shopping items are currently manual. The schema includes a `manual` flag but does not record which planned meals contributed generated ingredients.
- Shopping-item names are currently unique per household after case-folding and trimming.
- The meal planner currently saves directly through the planned-meal repository. There is no atomic operation spanning planned meals and shopping generation.
- A known linked-recipe selection/save defect must be resolved and verified on `main` before this package moves to Ready or receives `codex-ready`.

## Scope

### Included

- Automatically reconcile recipe ingredients into the active shopping list when a recipe-linked planned meal is created.
- Reconcile contributions when a planned meal changes recipe, becomes free text, or is removed.
- Track generated provenance per planned meal and ingredient so retries are idempotent and changes are reversible.
- Aggregate compatible duplicate ingredients without inventing unsafe conversions.
- Preserve manual items, explicit user edits, completion state and removals.
- Present generated items in the existing responsive shopping workflow with subtle source context where useful.
- Provide household-scoped server-side operations, RLS and negative authorization coverage.

### Explicitly Out of Scope

- Subtracting pantry stock or suppressing ingredients already held; CS-23 and CS-50 cover later pantry-aware behaviour.
- Automatically consuming pantry stock when a meal is cooked.
- AI ingredient interpretation, probabilistic matching or third-party services.
- Converting between unlike units or guessing quantities from ambiguous ingredient text.
- Scaling ingredients by household size or servings.
- Generating items from free-text dinners.
- Retailer export, multiple named lists, historical lists, reminders or notifications.
- Automatic grocery or kitchen-storage categorisation beyond deterministic existing defaults.

## Functional Requirements

### FR-1 — Generate after a linked meal is saved

Creating a planned meal with a valid recipe link must create the meal and reconcile its ingredient contributions as one authoritative server-side operation.

**Acceptance criteria**

- [ ] Every meaningful ordered ingredient row from the linked recipe contributes to the active household shopping list.
- [ ] Ingredient display text remains lossless when structured quantity or unit data is absent or ambiguous.
- [ ] The planned meal and its contributions either succeed together or fail together.
- [ ] Retrying the same operation does not create duplicate contributions or inflate quantities.
- [ ] A free-text meal saves normally and creates no generated shopping contribution.
- [ ] A recipe with no meaningful ingredients saves as a planned meal and returns a clear non-blocking “no ingredients added” result.

### FR-2 — Aggregate only compatible ingredients

Generated ingredients representing the same normalised item may share one visible shopping row when their quantities and units can be combined without guessing.

**Acceptance criteria**

- [ ] Matching names with the same normalised unit and numeric quantities are summed from source contributions.
- [ ] Matching names with missing, ambiguous or incompatible units remain lossless and are not converted or silently discarded.
- [ ] Case and surrounding whitespace alone do not create duplicates.
- [ ] Aggregation is deterministic and produces the same result after a retry or full reconciliation.
- [ ] The implementation defines and tests the treatment of fractions, decimal quantities and display-only ingredient rows.

### FR-3 — Reconcile meal edits and removals

Generated shopping state must follow its source planned meal without damaging unrelated list state.

**Acceptance criteria**

- [ ] Changing a meal from recipe A to recipe B removes A's active contributions and adds B's contributions atomically.
- [ ] Unlinking a recipe removes that meal's contributions and preserves the free-text planned meal.
- [ ] Removing a planned meal removes only that meal's active contributions.
- [ ] Moving a meal to another date without changing the recipe does not duplicate or remove its contributions.
- [ ] Contributions from another planned meal to the same visible ingredient remain intact.

### FR-4 — Preserve household edits and intent

Automatic reconciliation must not overwrite the household's explicit shopping-list choices.

**Acceptance criteria**

- [ ] Manual shopping items are never deleted or reset by generation or reconciliation.
- [ ] Editing a visible generated item does not allow a later meal reconciliation to silently overwrite the user's display name, quantity, unit or category.
- [ ] Completing or restoring an item remains under user control and is not reset by reconciliation.
- [ ] A user-removed generated item remains suppressed for the relevant active source contribution until an explicit user action restores it or a genuinely new source is added, according to a documented deterministic rule.
- [ ] The UI distinguishes helpful generated provenance without adding extra mandatory inputs.

### FR-5 — Household-safe authoritative operation

Generation and reconciliation must be authorised and executed against household-owned records on the server/database boundary.

**Acceptance criteria**

- [ ] Only an active household member can create, update or remove planned-meal contributions for that household.
- [ ] A recipe from another household cannot be linked or read through the operation.
- [ ] Public/shared recipe visibility, where supported by the current recipe contract, does not expose another user's private recipe or household data.
- [ ] Client-supplied household IDs, ingredient payloads or aggregate totals are not trusted as authorization or source-of-truth data.
- [ ] Owner, active member, inactive member and unrelated-user database tests prove the boundary.

### FR-6 — Recoverable user experience

The planner and shopping experiences must make automatic generation understandable without adding friction.

**Acceptance criteria**

- [ ] A successful recipe-based meal save gives a concise indication that ingredients were added or reconciled.
- [ ] A failure leaves the dialog recoverable and does not falsely show a saved meal.
- [ ] Shopping-list loading, empty and error states continue to work.
- [ ] The existing mobile quick-add remains limited to item and optional quantity.
- [ ] Manual add, edit, complete, restore and remove flows continue to work for existing households.

## UX and Interaction Requirements

- Keep automatic generation implicit after a recipe-based save; do not add a mandatory confirmation step.
- Use a short status message such as “Dinner added · shopping list updated” when both operations succeed.
- Do not show a shopping-generation promise for free-text meals.
- Generated-source detail should be progressively disclosed and must not clutter each row on mobile.
- Use accessible live-region behaviour for save outcomes without moving focus unexpectedly.
- Preserve keyboard operation, touch targets, dialogs and existing responsive layouts.

## Data and Domain Requirements

- Add a durable contribution/provenance model keyed to household, active shopping list, planned meal and recipe ingredient/source position. Do not attempt to infer provenance later from display names.
- Keep visible shopping-item state separate from immutable or replaceable generated contributions so user-controlled fields can survive recalculation.
- Enforce idempotency with database constraints, not client timing.
- Use an additive migration. Existing manual shopping items and active lists must remain valid without backfilling invented provenance.
- Revisit the current household-wide normalised-name uniqueness constraint only through a forward migration with explicit compatibility tests.
- Store enough original ingredient text and parser/source identity to reproduce a lossless display when aggregation is unsafe.
- Use deterministic normalisation and unit compatibility functions with versioned behaviour where future reprocessing could change results.
- All generated records must be household-scoped and protected by RLS or inaccessible private-schema functions.
- Do not regenerate historical meals automatically during migration. Any backfill must be a separately approved, explicit user operation.

## Technical Direction

- Introduce one server-authoritative database RPC or equivalent transactional boundary for planned-meal create/update/remove plus shopping reconciliation.
- Reuse current planned-meal, recipe and shopping domain types through a typed application service; do not coordinate independent browser requests.
- Keep contribution calculations deterministic and testable in isolation.
- Prefer exact normalized-name and compatible-unit aggregation for this milestone. Preserve separate/lossless display data when confidence is insufficient.
- Do not add a dependency, hosted provider, background queue or AI service.
- Preserve current repository fallbacks only where they remain safe; do not silently bypass generation when the new database contract is missing.

## Implementation Guidance

1. Verify the linked-recipe planner defect is fixed on current `main` before claiming CS-22.
2. Move this package to `engineering/ready/`, add `codex-ready`, and confirm all AIEOS eligibility checks before starting.
3. Inspect current planned-meal, recipe-ingredient and shopping-list migrations, generated types, repositories and tests.
4. Design the visible-item/contribution/tombstone model and document invariants before writing the migration.
5. Add the forward migration, private helper functions, authoritative RPC, constraints, grants and RLS tests.
6. Replace browser-side planned-meal mutations with the typed atomic operation.
7. Extend shopping reads and UI only as required for generated provenance and preserved user intent.
8. Add domain, repository, integration, pgTAP/RLS and end-to-end coverage.
9. Run the repository's full mandatory quality suite and migration checks.
10. Validate desktop and mobile hosted Preview flows with synthetic household data.

## Security and Privacy

- The operation must derive the caller from `auth.uid()` and verify active household membership.
- Private recipe ingredients must never cross household boundaries.
- Public recipe content may be consumed only through the approved visibility contract.
- Security-definer functions must use `set search_path = ''`, fully qualified identifiers, least-privilege grants and explicit authorization checks.
- Add negative tests for forged household, planned-meal, recipe, shopping-list and contribution identifiers.
- No production data, credentials or real household content may be used in fixtures or evidence.

## Accessibility

- Save outcomes are announced once and do not create duplicate screen-reader noise.
- Generated-source context has meaningful text and does not rely on colour or an icon alone.
- All existing shopping and planner controls remain keyboard operable with predictable focus.
- Mobile layouts remain usable at 320 CSS pixels without horizontal overflow.

## Test Plan

### Unit tests

- Ingredient name and unit normalisation.
- Compatible quantity aggregation, including decimals and fractions.
- Ambiguous/missing/incompatible quantity and unit handling.
- Reconciliation diffs for create, recipe swap, unlink, date move and removal.
- Preservation of manual values, completion state and suppressed generated items.
- Idempotent repeat processing.

### Integration and database tests

- Atomic planned-meal and contribution creation.
- Aggregate refresh when multiple meals contribute the same ingredient.
- Recipe swap, unlink and deletion behaviour.
- Existing manual-item compatibility and duplicate-name constraints.
- Owner/member success plus inactive/unrelated/forged cross-household denial.
- Public/shared and private recipe visibility boundaries.
- Migration from the CS-21 schema, generated-type freshness and rollback assumptions.

### End-to-end and hosted preview tests

- Add a linked recipe dinner and confirm its ingredients appear in Shopping.
- Add the same recipe twice and confirm deterministic aggregation without duplicates.
- Edit and complete a generated item, then add/move/remove a contributing meal and confirm user intent is preserved.
- Swap and unlink recipes and confirm only relevant contributions change.
- Add a free-text dinner and confirm no shopping items are generated.
- Verify manual shopping quick-add remains unchanged.
- Repeat critical paths on desktop and a narrow mobile viewport using keyboard-accessible controls.

## Quality Gates

- [ ] `npm ci`
- [ ] `npm run preflight`
- [ ] `npm run format`
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Documentation command checks pass.
- [ ] Disposable Supabase reset, database lint, pgTAP/RLS and generated-type freshness pass.
- [ ] Relevant Playwright, responsive and accessibility checks pass.
- [ ] No secrets, credentials or production configuration are committed.
- [ ] GitHub Actions and Vercel Preview pass.
- [ ] Hosted Preview acceptance criteria are manually validated.
- [ ] Jira contains the PR, Preview evidence and current workflow status.

## Database Release Discipline

- The implementation PR must not deploy Production.
- After merge, Production deployment must use the protected **Production database release** workflow with the exact approved `main` SHA.
- Dry-run and migration-history verification are mandatory.
- Released migrations are immutable; fixes use new forward migrations.
- Normal CI must not connect to or deploy hosted Production.

## Definition of Done

- [ ] All functional acceptance criteria are met.
- [ ] Existing planner, recipe, shopping and manual quick-add behaviour remains intact.
- [ ] Automated coverage protects the main flow, retries and user-edit preservation.
- [ ] Cross-household access is denied and proven.
- [ ] Preview is validated on desktop and mobile.
- [ ] PR checks and human review pass.
- [ ] Required Production database release is completed and verified after merge.
- [ ] Jira is Done and contains PR, merge, deployment and validation evidence.
- [ ] Package is moved to `engineering/completed/` and the engineering index is current.

## Hosted Preview Validation

Use synthetic recipes containing compatible, incompatible and ambiguous ingredients. Validate the exact flows in the end-to-end section on the Vercel Preview URL with one active household member and one unrelated synthetic account. Record what was actually tested, device/viewport, expected and actual results, any Deployment Protection prerequisite, and any unverified provider or database behaviour. Do not claim Preview completion from local tests.

## Rollback

- Before Production release, revert the application and migration commits together.
- After a shared database release, disable use of the new RPC through a forward application change and correct schema/data only through additive forward migrations.
- Never edit or delete an accepted migration.

## Cost

A$0/month and A$0/year. No dependency, provider or tier change is approved.

## PR Requirements

PR title: `[CS-22] M10B — Generate shopping list from meal plan`

Include the Jira issue, package path, user outcome, data model and invariants, migration and RLS notes, tests and actual results, screenshots or recording, Preview URL and manual evidence, limitations, Production release steps and rollback notes.
