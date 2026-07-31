# CS-94 handover

- **Status:** End-to-end correction implemented, hosted validation pending
- **Baseline:** `main` at `704c40a617321fdab7948d3c150dbadd265c913f`
- **Branch:** `fix/cs-94-end-to-end-readiness`
- **Migrations:** `20260730230000_cs94_weekly_preparation_release_readiness.sql`,
  `20260731100000_cs94_bind_evaluation_to_deployment.sql`
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

## End-to-end production correction

The consolidated follow-up authorises the evaluation through the existing
`has_application_role` RPC using the signed-in administrator's JWT, so the function never reads the
sensitive roles table with its service credential. It safely reports unavailable authorisation,
prevents overlapping evaluations and recovers runs interrupted for more than 15 minutes.

Activation now requires the accepted evaluation and hosted smoke evidence to carry the same exact
deployment SHA. This closes the final release-identity gap found during the end-to-end review.
Production release order after merge is database migration
`20260731100000_cs94_bind_evaluation_to_deployment.sql`, the three weekly-preparation Edge
Functions with `COOKSMITH_DEPLOYMENT_SHA` set to the merge commit, then the 30-plan evaluation,
acceptance and AI activation.
