# ADR 016: Prepared freezer meals and Planner reservations

- **Status:** Proposed
- **Date:** 2026-10-06
- **Issue:** CS-99

## Context

Prepared meals are already-owned food, distinct from ingredient Pantry availability. Planning one must reserve portions without purchasing the optional linked recipe's ingredients. Concurrent household members, response loss and edits to existing dinners must not duplicate reservations or lose stock.

## Decision

Store physical portions in `freezer_meals`, one reservation per planned dinner in `freezer_meal_reservations`, and mutation receipts in `freezer_meal_events`. Available portions equal physical portions minus active reservations. Consumption explicitly decrements physical stock and changes the reservation to consumed; undo restores both. Deleting a reserved dinner releases its reservation. Deleting a consumed dinner does not return eaten food; the UI explains undo first. Archiving prevents new reservations and retains existing ones.

Use an authenticated, security-invoker RPC delegating to a narrowly scoped private security-definer transaction. Clients have SELECT-only stock access. The transaction validates `auth.uid()`, active membership, household-scoped identifiers, stock bounds and request identity. A stable operation UUID returns the original receipt on exact retry; reuse with a different request is rejected. Revision checks prevent stale inventory edits.

Serialise freezer commands by household advisory lock. Lock stock with `FOR NO KEY UPDATE`, preserving compatibility with foreign-key checks during concurrent plan deletion. Reservation/replacement also takes the existing Shopping advisory lock before locking the plan and removing generated contributions. Contribution writes lock their source plan for sharing and reject freezer provenance. Replacing an ordinary dinner keeps its identity and removes its generated contributions in the same transaction, retaining explicit manual shopping edits through existing reconciliation. Moves retain the original reservation. Automatic plan generation preserves freezer dinners.

A plan's distinct `freezer_meal_id` is the authority for exclusion from Shopping, regardless of an optional recipe reference on inventory. Browser roles cannot forge or erase this provenance directly. Recipe archive/unpublication does not prevent using stock or retaining an existing reference; deleted references become null. All existing recipe and ingredient Pantry behaviour remains intact.

## Alternatives

- Client-side read/decrement: rejected because simultaneous members can oversubscribe and interrupted requests can leave partial plans.
- Direct stock writes protected only by RLS: rejected because RLS alone does not enforce the multi-table reservation invariant.
- Recipe-only representation: rejected because already-cooked food must never regenerate ingredients.
- Full weight/expiry ledger: outside this beta scope.

## Consequences

Commands are serialised per household, appropriate for small household workloads. Stock refresh is explicit rather than realtime; the server rejects stale allocations. Portion units are user-defined whole portions or containers and must be used consistently. Removing a consumed plan removes its undo UI, but event evidence retains the outcome. Existing freezer reservations must remain readable during rollback.

## Security impact

Tables expose active-member reads only; anon and direct client writes are denied. Private privileged functions use an empty search path, fully qualified objects and explicit grants. The RPC validates identities rather than accepting caller actor IDs. Composite foreign keys enforce household agreement. Synthetic pgTAP and real authenticated local API checks cover foreign identifiers, inactive membership, forged provenance and concurrency.

## Cost impact

No additional service, paid evaluation or provider call. Estimated incremental recurring cost A$0/month and A$0/year within the existing database allocation. Receipt retention uses existing database storage.

## Migration impact

Additive migration `20261006012145_prepared_freezer_meals.sql`; no backfill or replacement of existing rows. Requires CS-96 UI dependency. Apply migration before releasing its client. In the current review queue, retain order PR189, PR190, PR191, then CS-99 so timestamp ordering and integration evidence match.

## Product Principles supported

Reduce invisible household work, preserve trust through explicit stock changes, and keep primary mobile actions calm and understandable.

## Rollback or reconsideration trigger

Keep the additive schema and receipts; disable freezer creation/reservation controls and forward-fix failures. Do not revert to a client that treats existing freezer entries as ordinary manual dinners or reintroduces generated ingredients. Reconsider the serialisation model only when measured contention or new stock semantics justify it.
