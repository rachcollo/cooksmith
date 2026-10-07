# Engineering Package — CS-97: Shopping period selection

## Metadata

- **Jira issue:** [CS-97](https://smillins.atlassian.net/browse/CS-97)
- **Epic:** Shopping Lists (CS-6)
- **Status:** PR191 owner functional pass; compact-default follow-up in draft review
- **Branch:** `feat/cs-97-shopping-default-dropdown` (follow-up; original PR191 merged)
- **Depends on:** CS-22
- **Blocks:** CS-25

## Product Outcome

Generate Shopping from only the planned meals the household is currently buying for.

## Scope and Decisions

- Add a top-of-Shopping period control.
- MVP presets are full active week, next 3 planned meals, next 5 planned meals and a custom contiguous range within the visible plan.
- Persist the household's latest valid selection; default existing households to the full active week.
- Filter generated contributions only. Manual items remain independent.
- Recurring staples appear once per active shopping cycle and do not multiply when the range changes.
- CS-61 continues to own alternate week boundaries and undated planning cycles.

## Acceptance Criteria

- [x] The active range is always visible and understandable.
- [x] Only in-range recipe contributions appear.
- [x] Changing range is reversible and does not delete plans or manual items.
- [x] Completion state is preserved for contributions that remain in range.
- [x] Invalid/stale ranges fall back safely with an explanation.
- [x] All members share the household selection and isolation passes.
- [x] Automated mobile select/range interaction, keyboard and axe checks pass; physical screen reader remains unverified.

## Technical Direction

Use one typed shopping-range value and the existing contribution reconciliation path. Store dates as household-local calendar dates, not inferred browser UTC timestamps. Avoid duplicating CS-61's planning-cycle abstraction.

## Verification

Test boundary dates, daylight saving, sparse plans, range changes, manual/completed items, staples, household switching and 320px accessibility. Run database/type checks if preference persistence changes.

## Release, Rollback and Cost

- **Expected migration:** Likely additive household shopping-period preference.
- **Expected Edge Function:** None.
- **Rollback:** Revert UI/logic and ignore retained additive preference.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-97: Choose the Shopping plan period`

## Implementation evidence

See [CS-97 handover](../../docs/engineering/handovers/cs97-shopping-period.md). Range changes project retained contribution snapshots; they do not destructively reconcile snapshots out of existence. Bought state and explicit overrides retain the current purchase-level contract. Active-member preference access uses its own table, preserving owner-only settings permissions.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Preserve period selection alongside PR196's 20px Shopping marks/44px targets; do not restore the shopper refresh action. Admin maintenance and Home remain unchanged. Exact-head checks are reported in PR191. Migration `20261006010046` predates released PR195; separately approved database release requires reviewed remote history and pending-set dry-run using protected Production database release on approved main with `allow_out_of_order_migrations: true` (`--include-all`). No Edge deployment or production changes performed.

## Integration after owner merges PR189 and PR190

Integrated main `c4f64ed2f5cbe17a2d2a005305e8cf633d82399d`. The API table-contract conflict retains both `household_recipe_favourites` and `household_shopping_periods`; no schema or policy change is introduced by this resolution. Preserve accepted planner anchoring, favourites and PR196 polish/security contracts. Exact-head results are recorded in PR191. Database release still requires separately reviewed history/pending migrations and the protected `allow_out_of_order_migrations` option; no deployment performed.

## Owner-requested compact default follow-up (7 October)

Rach reports PR191 functions correctly but its period panel is too cluttered. See [follow-up handover](../../docs/engineering/handovers/cs97-shopping-default-dropdown.md). The owner-managed household Settings default is separate from the shared current-week Shopping override. The compact dropdown auto-applies presets; custom dates alone need Save dates. Existing purchases, manual items, overrides, bought state and history remain intact. Next 3/5 means planned meals, not days.

Migration: `20261007020500_household_shopping_default.sql`; no Edge Function or added cost. New migration must precede the new client through a separately approved protected release. Owner visual acceptance, hosted authenticated verification and physical-device checks remain pending. No automatic Jira Done or public-smoke acceptance.
