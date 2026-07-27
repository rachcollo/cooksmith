# CS-34 handover: Household food preferences and cooking context

- **Date:** 2026-07-27
- **Branch:** `feat/cs-34-household-food-preferences`
- **Target:** `main`
- **Baseline:** `9aff8bc08480f359b6c0816c93cfeecf21689d12`
- **Commit:** Pending
- **Pull request:** Pending
- **Status:** Implemented; CI database and hosted Preview validation pending

## Objective

Provide one optional household profile that keeps person-specific and household-wide safety
constraints separate from soft food and cooking preferences for future recommendation consumers.

## Changes made

- Added a stable domain contract and downstream recommendation projection.
- Added an optional Settings flow for people cooked for, allergies, intolerances, dietary needs,
  cuisines, liked/avoided foods, cooking confidence, time and grocery store.
- Added explicit confirmation whenever saved safety constraints change.
- Added an additive household-scoped preference table, audit fields and active-membership RLS.
- Added generated database types, domain tests and pgTAP contract/isolation coverage.

## Migrations

`supabase/migrations/20260727170000_household_preference_profiles.sql`

The PR does not deploy Production. After merge, release the migration through the protected
Production database workflow using the exact accepted `main` SHA. Use a forward fix after release;
never edit the released migration.

## Validation

| Check                                                     | Result                                         |
| --------------------------------------------------------- | ---------------------------------------------- |
| Format, lint and strict TypeScript                        | Passed                                         |
| Vitest                                                    | Passed — 52 files, 264 tests                   |
| Production build                                          | Passed                                         |
| Database config                                           | Passed                                         |
| Local reset, lint, pgTAP and generated-type freshness     | Pending CI; local Supabase runtime unavailable |
| Hosted Preview, mobile, keyboard and screen-reader checks | Pending                                        |

## Security, privacy and accessibility

- All browser reads and writes require active membership in the selected household.
- People cooked for are JSON preference subjects only; they never create accounts or access.
- Safety changes require a native, keyboard-accessible confirmation.
- Fields are labelled, optional input is explicit, values survive recoverable errors, and the
  layout uses responsive one/two-column groups without horizontal overflow.
- Synthetic test data only. No secrets or real household/health data.
- Cost impact: A$0/month and A$0/year.

## Rollback

Revert application wiring. Once the additive migration is released, retain the table and apply any
schema correction through a new forward migration.
