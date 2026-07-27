# CS-90 handover: Recipe Intelligence foundation

- **Date:** 2026-07-27
- **Branch:** `feat/cs-90-recipe-intelligence`
- **Target:** `main`
- **Baseline:** `a0f22d5cde5e1355d5f879eafb782e0ba505273b`
- **Status:** Ready for review after required CI

## Product impact

Recipe intelligence is reusable, traceable and asynchronous. Saving a recipe remains immediate, no new user click is introduced, and provider failure leaves Cooksmith usable.

## Migrations and functions

- `20260727195500_recipe_intelligence_foundation.sql`: additive versions, jobs, results, settings, triggers, RLS and atomic activation.
- `enrich-recipe`: protected deterministic worker, strict OpenAI adapter and bounded backfill.

The PR does not deploy Production. After merge, release the migration first and Edge Function second through the protected workflows using the exact accepted `main` SHA.

## Review

- Run the full static and database CI gates.
- Confirm cross-household denial and stale activation pgTAP tests.
- In isolated Preview, keep AI disabled and verify deterministic completion first.
- Then enable AI for the synthetic evaluation corpus only and review structured-output validity, unsupported-data rate, latency, token usage and calculated A$ cost.
- Do not unblock CS-81 if any invented/unsafe content appears or provider evaluation is incomplete.

## Rollback

Use the server emergency stop, disable enqueueing, preserve immutable evidence and issue forward schema fixes. No accepted migration should be edited.
