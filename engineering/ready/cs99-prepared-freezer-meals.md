# Engineering Package — CS-99: Prepared freezer meals

## Metadata

- **Jira issue:** [CS-99](https://smillins.atlassian.net/browse/CS-99)
- **Epic:** Pantry (CS-3)
- **Status:** Implemented, manual validation pending
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

- [x] Members can add, edit, archive and restore valid freezer meals.
- [x] Planner search shows available freezer meals with clear stock context.
- [x] A freezer-sourced plan entry contributes zero recipe ingredients.
- [x] Reservation and consumption are explicit, idempotent and concurrency safe.
- [x] Moving/deleting reconciles reservations without silent stock loss.
- [x] Migration preserves existing Pantry, recipe and plan data.
- [x] RLS and forged-identifier negative tests pass.
- [x] Mobile, keyboard, reflow and axe checks pass.

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

## Implementation evidence

See [handover](../../docs/engineering/handovers/cs99-prepared-freezer-meals.md) and [proposed ADR 016](../../docs/architecture/decisions/016-prepared-freezer-reservations.md). Local acceptance checks passed; authenticated hosted Preview, physical-device and assistive-technology checks remain pending. Checked boxes describe local evidence, not a release or Done decision.

The branch is explicitly stacked on CS-96 / PR189 (`e67d5711833a103c21b62dcb92306066bfac7cec`), whose accepted-main base is `b2fb576ebce250e325df297670d62df18c523339`. Review CS-99's delta from that stack base. Do not merge before PR189 is accepted. CS-98 is implemented in draft [PR193](https://github.com/rachcollo/cooksmith/pull/193). Neither draft is beta acceptance.


## Stale-edit HTTP correction

The original stale-edit guard used SQLSTATE `40001`. Local PostgREST 14.5 retried indefinitely; SQL tests alone missed the HTTP timeout. Forward migration `20261006023152_freezer_stale_edit_http_conflict.sql` changes only that deliberate guard to `PT409`, preserving revision checks and all mutation protections. The adapter gives actionable close/refresh/review guidance. A real HTTP regression now runs in database CI, and a component regression verifies recovery with the latest stock revision. The original shared migration remains unchanged. See the updated handover for combined verification and release ordering.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Preserve PR196 Pantry/Home/Shopping changes and WebKit CI. Resolve shared local HTTP client to accepted main's raw-client plus schema-scoped wrapper, retaining localhost-only endpoints; run all Shopping and freezer HTTP tests serially. PR189 remains a dependency. Exact-head integration checks are reported in PR192. Migrations `20261006012145` and `20261006023152` predate released PR195: use the separately approved protected Production database release on approved main with `allow_out_of_order_migrations: true` (`--include-all`) only after reviewing remote history and the complete pending set/dry-run. No Edge release or production actions performed.

## Integration after owner merges PR189 and PR190

Integrated main `c4f64ed2f5cbe17a2d2a005305e8cf633d82399d`. API-contract expectations retain both freezer tables and household favourites. Generated types and unit contracts incorporate accepted favourites. Planner input anchoring, freezer choices, PR196 polish and HTTP/WebKit security checks remain. Exact-head checks are recorded in PR192. No new migration, Edge Function or production action is introduced by this integration.
