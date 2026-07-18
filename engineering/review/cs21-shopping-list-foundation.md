# Engineering Package — CS-21: Shopping List Foundation

**Status:** In Review

**Branch:** `feat/cs-21-shopping-list-foundation`

**Base:** `main` at `70bd741ad8056bdf77f61ff1de4ec408ae7a5bc5`

**Depends on:** CS-20 (Done)

**Blocks:** CS-22

## Objective

Replace the Shopping placeholder with one calm, household-shared current list. An active household member can add a manual item, edit its core details, mark it done or needed, and remove it.

## Approved behaviour

- Show outstanding and completed counts.
- Add a named item with optional quantity/unit and one grocery category.
- Group outstanding items by grocery category and keep completed items in a separate section.
- Persist completion and allow it to be reversed.
- Edit or remove an item using clearly named, keyboard-operable controls.
- Prevent duplicate names within a household, ignoring case and surrounding whitespace.
- Preserve household isolation with database RLS for owner, member, unrelated and inactive actors.
- Maintain one active shopping-list container per household so CS-22 can add generated items without replacing this contract.

## Data contract

- `cooksmith.shopping_lists`: household-owned versioned container; one active list per household.
- `cooksmith.shopping_list_items`: household/list ownership, display name, optional numeric quantity/unit, category, completion, manual provenance, position and audit fields.
- New household creation automatically receives an active list. Existing active households are backfilled.
- Browser clients read list containers and perform policy-protected CRUD on items only.

## Out of scope

- Generating items from planned recipes (CS-22);
- ingredient aggregation or unit conversion;
- Pantry subtraction;
- multiple named lists, list history or sharing outside the household;
- reordering, retailer export, reminders, scanning or AI.

## Acceptance criteria

- [x] `/shopping` is a real responsive household workflow, not a placeholder.
- [x] Add, edit, complete/uncomplete and remove actions update the visible list and repository.
- [x] Invalid and duplicate inputs show useful errors.
- [x] Empty, loading and failure states are explicit.
- [x] Controls have accessible labels and mobile touch targets.
- [x] Additive migration provides constraints, indexes, audit fields, RLS and least-privilege grants.
- [x] Unit and integration coverage prove the main experience.
- [ ] Disposable database reset, lint, pgTAP and generated-type freshness pass in CI.
- [ ] Hosted Preview desktop/mobile smoke testing passes.

## Rollback

Revert the application and migration commit before release. After a shared database release, use an additive forward fix; do not edit the accepted migration.

## Cost

A$0/month and A$0/year. No dependency or provider changes.
