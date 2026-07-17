# Milestone 7B handover — Household staples experience

## Status

Implemented on `m07b-household-staples-experience` for draft review. Automated and hosted validation remain pending.

## Delivered

Cooksmith Pantry now organises household staples across Pantry, Fridge and Freezer while remaining one feature. Existing items migrate to Pantry, common fridge/freezer defaults are added, and users can search, filter, move, edit, remove and quickly change availability.

## Production migration warning

The new migration requires the protected **Production database release** workflow after merge. Release the exact approved `main` SHA, review the dry run, verify migration history and perform synthetic hosted smoke tests. Never edit the released Milestone 7A migration.

## Explicit boundaries

- Locations are simple organisational labels only.
- No expiry or temperature management exists.
- No precise inventory tracking or history exists.
- Recipe, meal-planning and shopping work has not begun.
- Scanning, notifications, offline sync and AI are not included.

## Validation handover

Run the full suite required by `docs/engineering/CODEX_BUILD_RULES.md`, including database, browser, responsive and accessibility checks. The connected GitHub workflow did not provide a local runtime, Docker or browser, so those results must come from CI and hosted Preview validation.

## Next milestone

Do not begin another Pantry milestone until this PR is reviewed, all required checks pass, the migration is released and hosted Pantry/Fridge/Freezer smoke testing succeeds.
