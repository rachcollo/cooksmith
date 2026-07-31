# CS-94 handover

- **Status:** Implemented, validation pending
- **Baseline:** `main` at `11fbd755c5755a8210dd81dc7c891c50e3b842dd`
- **Branch:** `feat/cs-94-get-ahead-ai-release-readiness`
- **Migration:** `20260730230000_cs94_weekly_preparation_release_readiness.sql`
- **Edge Functions changed:** `generate-weekly-preparation-plan`,
  `get-weekly-preparation-plan`, `evaluate-weekly-preparation`
- **Dependencies added:** none
- **Fixed cost impact:** A$0/month; A$0/year

Local application validation passed: formatting, documentation commands, lint, typecheck, all 319
tests, production build and database configuration validation. Database runtime, hosted provider,
Preview, responsive and assistive-technology validation remain required before approval.

Production remains unchanged. Merge alone does not apply the migration, deploy the functions, run
the evaluation, accept evidence or enable AI.

## Hosted evaluation correction

The production follow-up makes every weekly-preparation REST request explicitly target the
`cooksmith` schema. The evaluation aligns the persisted model identifier with the configured
provider model before creating evidence, clears stale smoke evidence when that identity changes,
and records new smoke evidence only after all 30 cases complete. Admin receives safe
configuration, authorisation and persistence failure categories without provider or database
details.

This correction changes no migration or database contract. After merge, deploy
`evaluate-weekly-preparation`, `generate-weekly-preparation-plan` and
`get-weekly-preparation-plan` through the protected Edge Functions release, then rerun and accept
the 30-plan evaluation before enabling AI assistance.
