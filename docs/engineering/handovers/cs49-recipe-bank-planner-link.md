# CS-49 Recipe-bank Planner Links — Handover

## Reviewer outcome

Verify that selecting a public recipe-bank meal saves to the planner, while free-text and household recipe choices still work.

## Preview and release checklist

- Confirm CI database reset, lint, pgTAP and generated-type freshness pass.
- Merge only after the required AIEOS checks pass.
- Run the protected Production database release with the exact merged `main` SHA and `--include-all` only if the dry run reports an earlier pending migration.
- Confirm migration history contains `20260719071803_link_imported_recipes_to_planned_meals.sql`.
- In the deployed application, add a public recipe-bank meal and confirm its recipe details reopen from the planner.
- Add a free-text meal and confirm it still saves.

## Release

A Production database release is required after merge. No Edge Function release is required.

## Recovery

Released migrations are immutable. Apply a forward migration if a database correction is required; revert the application commit only while keeping the additive columns in place.
