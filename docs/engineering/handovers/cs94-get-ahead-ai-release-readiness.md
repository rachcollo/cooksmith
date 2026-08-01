# CS-94 handover

## 2026-08-01 evaluation review-evidence correction

- Baseline: `main` at `146f149` (merge of PR #148).
- Branch: `fix/cs-94-evaluation-review-evidence`.
- Replaces the repeated v2 synthetic input with 30 distinct five-meal cases across 15, 30 and 60 minute sessions, including honest-empty and safety-boundary cases.
- Persists the exact deterministic validation or product-quality reason for every failed case and separates schema-valid quality failures from validator fallbacks.
- Marks any incomplete review as failed, withholds hosted smoke evidence, and exposes a safe failure summary in Admin. Accept remains disabled until all 30 cases pass.
- Migration `20260801193000_cs94_evaluation_review_evidence.sql` disables AI, clears misleading smoke evidence and advances the corpus identity to v3. It is an additive forward fix and does not edit released migrations.
- Edge Function changed: `evaluate-weekly-preparation`.
- Dependencies added: none. Fixed cost impact: A$0/month and A$0/year. Each evaluation continues to make 30 provider calls under existing pricing controls.
- Local validation passed: `npm ci`, formatting, format check, documentation command audit, lint, typecheck, all 356 Vitest tests and production build. The managed runner could not complete preflight or database reset/lint/pgTAP because the pinned Supabase CLI attempts to write `/root/.supabase`; those unchanged gates remain required in CI.
- Production remains unchanged. After merge, release the forward migration and Edge Function from the exact approved `main` SHA, then run the v3 evaluation. Accept and enable AI only if Admin reports 30 of 30 cases passed with no failure reasons.

## 2026-08-01 meal-strategy correction

- Baseline: `main` at `e32180a` (merge of PR #147).
- AI now reviews all selected meals and the actual available time as one planning problem.
- Deterministic validation owns source traceability, safe action eligibility, storage/lead-time requirements and the time ceiling.
- Migration `20260801010124_cs94_ai_preparation_strategy.sql` disables the previous AI generation and invalidates its accepted evaluation identity.
- Release order after merge: approve the Production database release, approve the Production Edge Function release, allow the Vercel deployment, then run and accept the new 30-plan evaluation before re-enabling AI.
- Cost: no new service or dependency. Provider cost remains usage-based under the existing OpenAI pricing controls. The new evaluation makes 30 model calls and records the measured A$ total before acceptance.

## Get Ahead preparation-period and replanning correction

- Added a visible preparation-period selector that defaults to the following Monday–Friday and supports this week, next week, or a custom start/end range.
- Kept ended sessions resumable and added an explicit update path for dates or available time.
- Added automatic saved-session reconciliation using the selected period, meal and recipe versions, and weekly preparation cache identity.
- Reconciliation retains completed tasks that still apply, removes obsolete work, and adds new eligible tasks without marking them complete.
- The checklist now displays its date range and time budget and explains when less useful preparation exists than the time selected.
- This correction has no migration, Edge Function, dependency, provider, privacy, or recurring-cost impact. It requires the normal Vercel application deployment only.

- **Status:** Household generation correction implemented, CI and hosted validation pending
- **Baseline:** `main` at `e42acede9c6063417744f81fa7fe73b3f6eaf74d`
- **Branch:** `fix/cs-94-household-generation-permissions`
- **Migrations in this correction:** none
- **Edge Functions changed in this correction:** `get-weekly-preparation-plan`
- **Dependencies added:** none
- **Fixed cost impact:** A$0/month; A$0/year

Local application validation passed: formatting, documentation commands, lint, typecheck, all 342
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

## Provider contract correction

The production evaluation failure was traced to an unsupported `uniqueItems` constraint in the
strict Responses API schema. The correction removes unsupported array constraints while retaining
Cooksmith's application-side decision validation. Provider HTTP category, safe error code,
parameter and request ID are logged as operational metadata only; provider response text and
Cooksmith content remain excluded.

Each completed evaluation case is now persisted immediately. If a later provider call fails, the
run retains its completed-case evidence and aggregate counters and reports a specific safe failure
category in Admin. The protected release workflow binds `COOKSMITH_DEPLOYMENT_SHA` to the approved
commit before deploying the functions. This correction requires an Edge Function release only and
no database migration.

## Household generation permission correction

The household Get Ahead orchestrator now verifies active membership through the existing
`is_active_household_member` RPC using the signed-in user's JWT before it loads any plan data. It
no longer attempts to read the protected `household_members` table with a service credential.
Meals, settings and enrichment continue to load only after that authorisation decision through the
privileged server boundary.

Authentication, membership verification, missing membership, plan-data, enrichment, worker
configuration, worker availability and invalid worker response failures now have distinct
privacy-safe response codes. The household experience continues to fall back calmly without
showing database, provider, model or credential details. Regression coverage verifies the caller
JWT is used before privileged plan loading and prevents the protected-table query from returning.
This correction requires an Edge Function release only and no database migration.
