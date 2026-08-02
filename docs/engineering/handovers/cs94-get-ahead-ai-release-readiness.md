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

## Failed-case review correction

- Baseline: `main` at `2999822881f6cd7e2719c68706bdf441b74bd80a`.
- Branch: `fix/cs-94-evaluation-case-review`.
- The Admin evaluation panel now lists every failed case as an expandable review containing its
  synthetic meals, available time, generated tasks, exact rejection reason and the likely fix
  area. Earlier runs remain readable and identify evidence that was not previously recorded.
- Migration `20260802013000_cs94_evaluation_case_review.sql` adds nullable or defaulted,
  privacy-safe evidence fields to the existing evaluation case table. It stores synthetic corpus
  details only and does not contain household meal or recipe data.
- Edge Function changed: `evaluate-weekly-preparation`. It persists the structured model decision
  alongside each case without storing provider payloads or operational errors.
- Dependencies added: none. Fixed cost impact: A$0/month and A$0/year. Provider usage per
  evaluation is unchanged.
- Local formatting, lint, strict types, 359 Vitest tests and the production build passed. Database
  configuration validation passed. Local database reset, lint, pgTAP and generated type checks
  could not run because this environment has no Docker-compatible runtime; CI remains the source
  of truth for those gates.
- After merge, release the migration before the Edge Function, refresh Admin, then run a new
  evaluation. The existing failed run cannot gain generated task evidence retrospectively.

## End-to-end real-life prep readiness correction

- Baseline: `main` at `3152caf1e06da3f2c294dacfce7fa8486df7cbaa`.
- Branch: `fix/cs-94-end-to-end-prep-readiness`.
- The AI receives only candidates that pass Cooksmith's protected action, storage, safety and
  traceability rules. Empty eligible portfolios return an honest empty session without a provider
  call.
- The planning prompt now states the exact time, usefulness, candidate-ID and task-title contract.
  The planner version advances to v3 and is included in the cache identity so older generated plans
  cannot be reused.
- Admin shows the read-only quality rule version and plain-language protected rules. Failed cases
  are labelled as automatic technical findings and collapsed by default; administrators are not
  asked to review recipes or propose prompt changes.
- Safety validation remains authoritative after generation. This change does not make protected
  rules editable and does not weaken acceptance: all 30 evaluation cases must still pass.
- Edge Functions changed: `evaluate-weekly-preparation` (shared planner version),
  `generate-weekly-preparation-plan` and `get-weekly-preparation-plan` (shared domain code).
- Database migrations: none. Dependencies added: none. Fixed cost impact: A$0/month and A$0/year.
- After merge, deploy the three weekly-preparation Edge Functions with the approved deployment SHA,
  run a new 30-plan evaluation, accept it only if all cases pass, enable AI, then trial a household
  15-minute and 30-minute session including end, resume and replan.

## Practical vegetable and raw-protein prep correction

- Baseline: `main` at `59ffcc71fad0997ab2f808f92b25ba5c7be24ab0`.
- Branch: `fix/cs-94-practical-prep-safety`.
- Vegetable chopping, slicing, dicing and grating remain worthwhile even as a single task. The
  evaluation no longer requires two separate tasks merely because 30 or 60 minutes are available.
- Raw meat may be cut, portioned, seasoned or marinated when the recipe-intelligence candidate has
  an explicit maximum lead time and storage reference. Raw-protein preparation cannot be combined
  into the same task as clean vegetable or ready-to-eat preparation.
- The provider prompt, deterministic validation, synthetic corpus, Admin explanation and regression
  tests now apply the same practical-prep policy. The evaluator still rejects unsupported work,
  unsafe storage, mixed hygiene boundaries, cooking filler and plans exceeding the time budget.
- Planner, quality-rule, prompt and corpus identities advance together. The cache key now includes
  the planner and quality-rule versions, and the forward migration disables AI and clears smoke
  evidence so no previous acceptance or cached result can authorise this behaviour.
- Edge Functions changed: `evaluate-weekly-preparation`, `generate-weekly-preparation-plan` and
  `get-weekly-preparation-plan` through their shared domain imports.
- Database migration: `20260802060000_cs94_practical_prep_safety.sql`. Dependencies added: none.
  Fixed cost impact: A$0/month and A$0/year. Evaluation usage remains 30 bounded provider calls.
- After merge, release the forward migration and the three Edge Functions from the exact approved
  `main` SHA, run and accept a new 30-plan evaluation, then enable AI and verify vegetable prep plus
  separately stored raw-protein prep in a real household plan.

## Calibrated prep timing correction

- Baseline: `main` at `0be9f4b0ac0903a77466d16dfc22baa03283acc3`.
- Branch: `fix/cs-94-calibrated-prep-timing`.
- The selected session duration is now a maximum, not a fill target. Model-assisted planning keeps
  the highest-priority worthwhile tasks that fit instead of rejecting the complete plan when later
  work would exceed the window.
- Task estimates are capped by an average-home-cook calibration derived from the preparation
  actions and ingredient count. Shared setup and clean-up are counted once per grouped task; a
  normal carrot, celery and onion dice is calibrated to 12 minutes rather than 20.
- Planner, quality-rule, prompt and corpus identities advance together. The forward migration
  disables AI and clears smoke evidence so only a fresh evaluation of the corrected timing rules
  can authorise activation.
- Edge Functions changed: `evaluate-weekly-preparation`, `generate-weekly-preparation-plan` and
  `get-weekly-preparation-plan` through their shared domain imports.
- Database migration: `20260802090000_cs94_calibrated_prep_timing.sql`. Dependencies added: none.
  Fixed cost impact: A$0/month and A$0/year. Evaluation usage remains 30 bounded provider calls.
- After merge, release the forward migration and three Edge Functions from the approved `main` SHA,
  run and accept a fresh 30-plan evaluation, then enable AI and verify a partially filled 30-minute
  household session plus the grouped vegetable duration.

## Trustworthy household task correction

- Baseline: `main` at `76d9ebce1637daa5bd89855ca9f3d0d2a0a5afc3`.
- Branch: `fix/cs-94-ai-plan-fallback`.
- Model-assisted output can no longer display copied recipe sentences as checklist titles. Titles
  containing recipe prose are replaced with concise, traceable ingredient preparation actions.
- Candidates that are actually cooking or serving instructions are excluded even when upstream
  enrichment has misclassified them as an ingredient preparation action. The provider prompt also
  requires short preparation-only titles and rejects duplicate filler.
- Every non-consolidated checklist row identifies its recipe. The progress summary reports actual
  session prep time remaining rather than presenting estimated later time savings as unused prep
  capacity.
- Planner, quality-rule, prompt and corpus identities advance together. The forward migration
  disables AI and clears previous smoke evidence, so cached v5 results and the previous evaluation
  cannot authorise v6.
- Edge Functions changed: `generate-weekly-preparation-plan` and
  `get-weekly-preparation-plan` through their shared domain import.
- Database migration: `20260802113000_cs94_trustworthy_ai_prep_tasks.sql`. Dependencies added:
  none. Fixed cost impact: A$0/month and A$0/year. Evaluation usage remains 30 bounded provider
  calls.
- After merge, release the forward migration and the two changed Edge Functions from the approved
  `main` SHA. Run and accept a fresh 30-plan evaluation before enabling AI, then verify that a real
  household plan shows concise prep actions, recipe attribution and correct remaining prep time.

## Recipe-level preparation intelligence correction

- Baseline: `main` at `efec570bf8140711e8deeca7b6eb97e7c6073c38`.
- Branch: `fix/cs-94-recipe-level-prep-intelligence`.
- Recipe Intelligence v2 derives reusable make-ahead opportunities from complete ingredients and
  instructions instead of limiting Get Ahead to ingredient action labels.
- Opportunities retain source references, average-cook effort, likely time saving, internal lead
  time and separation boundaries. Weekly planning consumes this contract directly and evaluation
  now requires meaningful meal coverage in multi-meal cases.
- User-visible “use within” and storage-deadline suggestions are removed. Lead time remains an
  internal eligibility check, and raw-protein work remains separate from clean preparation.
- Migration `20260802150000_cs94_recipe_level_prep_intelligence.sql` advances enrichment defaults,
  queues current recipe versions for v2 re-enrichment, disables weekly AI and advances the planner,
  prompt and corpus identities.
- Edge Functions changed: `enrich-recipe`, `evaluate-weekly-preparation`,
  `generate-weekly-preparation-plan` and `get-weekly-preparation-plan`.
- Dependencies added: none. Fixed cost impact: A$0/month and A$0/year. Existing bounded provider
  controls apply to the one-off re-enrichment.
