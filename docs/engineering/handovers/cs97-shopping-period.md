# CS-97 — Shopping period selection

## Outcome and baseline

Shopping has an explicit shared period: full active week, next three planned meals, next five planned meals, or custom contiguous dates within the current Monday-based plan. Apply is deliberate; the included range and meal count remain visible. Empty, stale and invalid ranges explain recovery. The independent branch starts from accepted main `b2fb576ebce250e325df297670d62df18c523339`.

## Preservation rules

The existing reconciliation path remains the authoritative source of contribution snapshots. The shopping repository projects only contributions belonging to selected meals, recalculating displayed quantities and source provenance without deleting/recreating plans, items or contributions. This avoids silently changing CS-101 ingredient structure, explicit refresh, overrides or bought state. Out-of-range rows reappear when their period is restored.

Manual items, including explicit Pantry restock additions, remain independent of the range. Changing dates never creates staples: a restock stays once in the existing active shopping list until removed or put away. No new recurring-staple generator is introduced.

Bought status stays on the saved purchase row, as in the accepted app; it is not a new per-meal stock ledger. A purchase adjustment keeps the entered amount when any associated meal is selected and is hidden when none is selected. If its last linked meal is deleted, the surviving adjusted purchase remains a manual item. The UI states that bought status and adjusted amounts remain attached to the saved purchase. Changing dates does not uncheck or prorate these explicit household choices. CS-98 must make its per-contribution receipt semantics consistent with this boundary before introducing atomic put-away.

Preset next-meal selection includes manual meals as planned slots, even though those meals have no ingredient contributions. It uses the saved local calendar anchor and deterministic date/meal-type ordering within the active week. Dates use the same local-calendar Monday boundary as the accepted Planner, not UTC timestamp slicing. The household choice is shared; fully custom cycles/timezone policy remains CS-61.

## Persistence and isolation

`household_shopping_periods` is an additive, constrained table with active-member SELECT/INSERT/UPDATE policies. The relation is deliberately separate from owner-only household settings; their permissions are unchanged. Missing/stale preferences fall back visibly to the current full week. Current valid choices persist across refresh and members. Focus and a 30-second visible-page refresh pick up another member's selection; household switches remount and discard late results. Save failures retain the previous visible list and offer retry.

Migrations in this PR: yes, `20261006010046_household_shopping_period.sql`.

Edge Functions changed in this PR: no. No new dependency or paid provider usage. A$0 additional fixed monthly/annual cost.

## Evidence

Local isolated PostgreSQL: 530 assertions across 33 files passed, including nine new member/isolation/date-constraint cases. Eight real local PostgREST/repository checks passed: default full week, shared member updates, quantity/provenance filtering, manual/bought preservation, empty-range hiding, override restoration, unrelated-household denial and retained plan/contribution snapshots. Nine calendar/domain tests also passed under `TZ=Australia/Melbourne`, including the daylight-saving weekend. The final orphaned-override guard also has a domain regression test.

Browser verification uses the real application with synthetic repositories: deliberate apply, failure recovery, reversible custom range, manual retention, 320px overflow, keyboard and axe. The first API fixture expected non-canonical kilograms/plural names; it was corrected to the existing canonical grams/singular storage. The first browser fixture expected lowercase Soap; the UI displays the existing capitalised label. No product validation was weakened. Standalone static validation passes with 597 tests across 79 files, format, lint, type-check and production build. The existing 28 browser checks and both new focused checks pass. Database lint/security advisors, preflight, docs and secrets checks pass. Exact-head CI is recorded on the draft PR.

## Integration and next work

PR189 (CS-96) adds manual/search planner entry; it still calls the same contribution reconciliation, and manual meals remain ingredient-free. PR190 (CS-80) changes Recipe Library favourites, not period selection. This PR needs neither draft to function. Generated database types and exact schema-contract lists must include both additive tables when CS-80 and CS-97 are integrated; regenerate types after applying both migrations rather than choosing one side of a conflict. Recommended integration order is PR189, PR190, then this PR. PR190’s 20261005 migration should be released before this 20261006 migration to preserve normal chronological migration history. The disposable combined checkout confirms 548 database assertions, 603 app tests across 81 files, and 14 real local API checks pass. All 34 combined browser checks passed; the final orphaned-override guard was then covered by the rerun app suite and both focused shopping-period browser checks. No feature branch was merged.

CS-99 explicitly depends on CS-96's planner search. Accept/rebase against that contract before freezer work, including transactional reservations, zero-shopping freezer provenance and an ADR. CS-98 already has CS-79 available, but must replace the current client-side quantity-increment put-away with the approved availability model and atomic per-contribution receipts; coordinate its Shopping page/repository changes with this period filter. Neither story is started here.

## Release and outstanding validation

Status: implemented; hosted/manual validation pending. This draft does not release Production. After approval/merge, use the protected Production database release workflow for the exact approved main SHA, with dry-run and migration-history verification. Apply the new relation before using the new Shopping code. Released migrations are immutable; forward-fix them. Roll back UI if needed and retain the additive preference data.

Hosted preview was not exercised against the production-backed environment. Release checks: two synthetic members share a saved range and reload it; an unrelated household sees neither preference nor items; narrow/widen around bought and adjusted purchases; check manual/restock retention and recipe refresh. Physical Safari/VoiceOver is unverified. Public deployment smoke is not proof of these authenticated flows.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Preserve period selection alongside PR196's 20px Shopping marks/44px targets; do not restore the shopper refresh action. Admin maintenance and Home remain unchanged. Exact-head checks are reported in PR191. Migration `20261006010046` predates released PR195; separately approved database release requires reviewed remote history and pending-set dry-run using protected Production database release on approved main with `allow_out_of_order_migrations: true` (`--include-all`). No Edge deployment or production changes performed.

## Integration after owner merges PR189 and PR190

Integrated main `c4f64ed2f5cbe17a2d2a005305e8cf633d82399d`. The API table-contract conflict retains both `household_recipe_favourites` and `household_shopping_periods`; no schema or policy change is introduced by this resolution. Preserve accepted planner anchoring, favourites and PR196 polish/security contracts. Exact-head results are recorded in PR191. Database release still requires separately reviewed history/pending migrations and the protected `allow_out_of_order_migrations` option; no deployment performed.
