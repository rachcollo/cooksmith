# Engineering Package — CS-97: Shopping period selection

## Metadata

- **Jira issue:** [CS-97](https://smillins.atlassian.net/browse/CS-97)
- **Epic:** Shopping Lists (CS-6)
- **Status:** Ready
- **Branch:** `feat/cs-97-shopping-period`
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

- [ ] The active range is always visible and understandable.
- [ ] Only in-range recipe contributions appear.
- [ ] Changing range is reversible and does not delete plans or manual items.
- [ ] Completion state is preserved for contributions that remain in range.
- [ ] Invalid/stale ranges fall back safely with an explanation.
- [ ] All members share the household selection and isolation passes.
- [ ] Mobile combobox/range interaction, keyboard and axe checks pass.

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
