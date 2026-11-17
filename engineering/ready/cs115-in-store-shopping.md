# Engineering Package CS-115: Tick off shopping quickly and reliably in store, even with poor signal

## Metadata

- **Jira issue:** `CS-115`
- **Jira link:** https://smillins.atlassian.net/browse/CS-115
- **Epic:** Shopping Lists (CS-6)
- **Priority:** Highest
- **Status:** `Ready`
- **Branch:** `feat/cs-115-in-store-shopping`
- **Depends on:** None
- **Blocks:** CS-121
- **Package path:** `engineering/ready/cs115-in-store-shopping.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S3, C4, U1, U2, U3 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

A shopper can tick items as fast as they pick them up, the ticks survive a loss of signal, and the list loads quickly however long the household has used Cooksmith.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `toggleCompleted` sets a page-wide `saving` flag that disables every tick box, then reloads the whole list (`src/routes/ShoppingPage.tsx:351, 370, 762`).
- There is no offline handling, service worker or queue.
- `shopping_stock_snapshot` returns all items, all planned meals, the whole pantry and all purchases (`supabase/migrations/20261007114403_stock_lifecycle_commands.sql:181-190`) and is called from Home, Shopping load, a 30 second interval, window focus and after every tick (`src/routes/HomePage.tsx:68`, `src/routes/ShoppingPage.tsx:160-161`).
- Quick add has no unit and a fixed `other` category (`src/routes/ShoppingPage.tsx:37-42, 506-525`).
- Completed items are removed one at a time behind a confirm (`:448, 540`). A failed load renders the empty-list message (`:498, 533-544`).

## Scope

### Included

- Per-item optimistic ticks with no page-wide lock.
- A device-side outbox for ticks made offline, replayed with the existing operation ids.
- A bounded snapshot and a lightweight Home summary.
- Change notification instead of a 30 second full reload.
- Quick add parsing and auto-category.
- Clear done.
- Load error with retry.

### Explicitly Out of Scope

- Full offline reading of recipes or planner.
- Installable PWA and push notifications.
- Retailer copy or share (CS-41).
- Ingredient identity changes (CS-116).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Several items can be ticked in quick succession; each tick is optimistic and independent.
- [ ] Ticks made offline are queued on the device, shown as waiting to sync, and applied when the connection returns with no silent loss.
- [ ] The snapshot is bounded to the active shopping period and open items and does not grow with household history.
- [ ] Another member's changes appear without a 30 second full reload.
- [ ] Quick add accepts input such as "2 L milk" and assigns a category.
- [ ] Clear done removes all completed items in one confirmed action.
- [ ] A failed load shows a retry action and never the empty-list message.
- [ ] Idempotent purchase, put-away and quantity-loop behaviour is preserved.

## Technical Direction

- Reuse the purchase operation id as the outbox key so a replay cannot double-count.
- Persist the outbox in IndexedDB or localStorage with try/catch; cap its size; surface conflicts (PT409) as a review prompt.
- Bound the snapshot in SQL: meals from the start of the current week, purchases not yet received, completed items within the active period.
- Prefer Supabase Realtime on household-scoped tables; fall back to a cheap version check if Realtime authorisation cannot be made RLS-safe.
- Reuse `categoriseIngredient` for quick add until CS-116 replaces it.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: outbox ordering, replay, conflict.
- pgTAP: bounded snapshot contents and membership.
- Integration: rapid ticking; offline then online; clear done.
- Playwright: mobile offline emulation; extend `quantity-loop.spec.ts`.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Yes: snapshot function replacement, clear-done RPC, Realtime publication if used.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0 expected within current Supabase plan Realtime quota; confirm quota before build.

## Deferred Work and Open Questions

- How long should bought items remain visible under Done before Clear done or put-away removes them?
- Is Realtime acceptable, or should a polling version check be used to avoid any quota exposure?

## Pull Request

Title: `CS-115: Tick off shopping quickly and reliably in store, even with poor signal`
