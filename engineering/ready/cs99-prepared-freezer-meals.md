# Engineering Package — CS-99: Prepared freezer meals

## Metadata

- **Jira issue:** [CS-99](https://smillins.atlassian.net/browse/CS-99)
- **Epic:** Pantry (CS-3)
- **Status:** Ready
- **Branch:** `feat/cs-99-prepared-freezer-meals`
- **Depends on:** CS-96 and current Planner/Shopping reconciliation
- **Blocks:** CS-78 freezer-meal patterns

## Product Outcome

Track prepared freezer meals and plan them as already-owned food that contributes no shopping ingredients.

## Scope and Decisions

- Prepared freezer meals are a separate household inventory from ingredient Pantry locations in CS-37.
- Record name, whole-number available units/portions, frozen date and optional use-first date/note.
- Optionally link a recipe, but the inventory entry remains the source of truth for shopping exclusion.
- Planning reserves stock; marking the meal used confirms consumption. Moving keeps the reservation, deleting releases it.
- Prevent negative or conflicting reservations and offer recovery from failed reconciliation.
- No barcode, exact weight, automatic expiry prediction or nutritional stock ledger.

## Acceptance Criteria

- [ ] Members can add, edit, archive and restore valid freezer meals.
- [ ] Planner search shows available freezer meals with clear stock context.
- [ ] A freezer-sourced plan entry contributes zero recipe ingredients.
- [ ] Reservation and consumption are explicit, idempotent and concurrency safe.
- [ ] Moving/deleting reconciles reservations without silent stock loss.
- [ ] Migration preserves existing Pantry, recipe and plan data.
- [ ] RLS and forged-identifier negative tests pass.
- [ ] Mobile, keyboard, reflow and axe checks pass.

## Technical Direction

Use additive freezer-meal, reservation and event/receipt persistence with database constraints for non-negative stock and uniqueness. Keep reservation mutations transactional. Record an ADR for the cross-domain inventory/plan contract.

## Verification

Test concurrent reservation, release, consume, undo/recovery, optional recipe deletion/unpublication, shopping exclusion and household switching. Run full database, RLS, generated-type, app and hosted Preview checks.

## Release, Rollback and Cost

- **Expected migration:** Yes, additive tables, constraints and RLS.
- **Expected Edge Function:** None expected.
- **Rollback:** Disable the UI; retain data and forward-fix immutable migrations.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-99: Track and plan prepared freezer meals`
