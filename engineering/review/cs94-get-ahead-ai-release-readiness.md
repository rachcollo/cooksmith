# Engineering Package — CS-94: Get Ahead AI release readiness

## Metadata

- **Milestone:** CS-94
- **Title:** Make Get Ahead AI generation safe to evaluate, activate and operate
- **Jira issue:** [CS-94](https://smillins.atlassian.net/browse/CS-94)
- **Epic:** CS-64 — Get Ahead – AI Preparation Assistant
- **Status:** `In Review`
- **Branch:** `feat/cs-94-get-ahead-ai-release-readiness`
- **Depends on:** CS-81, CS-91, CS-93 and CS-62
- **Blocks:** Production enablement of Get Ahead AI assistance
- **Package path:** `engineering/review/cs94-get-ahead-ai-release-readiness.md`
- **Verified baseline:** `main` at `e1ea759cb0f7e6e1029fc025b755044cb46c4355`
- **Package date:** 2026-07-30

## Product Outcome

Cooksmith must provide one controlled path from enriched recipes to a proven, usable Get Ahead experience. An administrator can verify configuration, prove the hosted generation chain, run and review a meaningful 30-plan evaluation, explicitly accept it and then enable AI assistance. Household users always retain a usable deterministic checklist and never see provider diagnostics.

The 30-plan evaluation is an internal release-quality test using 30 predefined representative weekly plans. It is not a 30-minute Get Ahead session. A household user’s selected prep duration is a separate product input.

The AI operation reviews all selected meals together and creates the best coherent make-ahead strategy for the household's available time. It prioritises meaningful midweek effort reduction, shared preparation and safe make-ahead work. Deterministic code validates time, traceability and safety constraints; it does not pre-decide the final checklist for the model.

## Current Baseline

The package is based on remote `main` commit `e1ea759cb0f7e6e1029fc025b755044cb46c4355`, after the CS-93 enrichment recovery and automatic recipe-enrichment work was merged.

Read-only production review established:

- Recipe enrichment and its current-version management path are operational.
- Weekly-preparation AI is disabled and emergency stop is clear.
- The activation command rejects enablement because no accepted 30-plan evaluation exists.
- Production has no completed evaluation runs and no usable admin workflow to create or accept one.
- The activation error is not surfaced clearly in the admin UI.
- The existing evaluation corpus does not prove meaningful provider-assisted ambiguous decisions.
- The first hosted generation attempt returned HTTP 503 before a plan was persisted.
- Two planned recipes have active enrichment and ten usable preparation candidates, so recipe readiness is not the current blocker.
- Cache identity, selected-household authority, chained timeout budgets, telemetry and hosted end-to-end verification require correction.

These observations define the starting problem; they must not be hard-coded as fixtures or assumed to remain current during implementation.

## Scope

### Included

- Deployment configuration preflight for the complete weekly-preparation chain.
- Explicit selected-household propagation and server-side authorisation.
- Bounded orchestration, provider and persistence timeout/retry behaviour.
- Privacy-safe structured outcomes and correlated operational logging.
- Versioned 30-plan evaluation corpus, execution, evidence, review and acceptance.
- Admin readiness checklist and safe activation workflow.
- Cache identity/invalidation across AI and generation configuration.
- Household outcome labels and safe current-plan retry.
- Privacy-safe generation telemetry and an operator runbook.
- Application, Edge Function, database, browser, accessibility and hosted smoke-test evidence.

### Out of Scope

- Re-enriching or rewriting recipes.
- Removing the 30-plan quality gate without replacement evidence.
- Automatically accepting evaluation results or enabling AI.
- Free-form AI chat or household-authored prompts.
- Exposing provider diagnostics, model internals or secrets to household users.
- A general-purpose experimentation or analytics platform.
- Production setting changes, plan generation or evaluation execution in the implementation PR.

## Functional Requirements

### FR-1 — Configuration and hosted-chain readiness

- [ ] Define every required application and Edge Function configuration value by name, owner and deployment boundary.
- [ ] Preflight proves presence and safe format without reading secret values into browser responses or logs.
- [ ] The release fails closed when required worker/provider configuration is absent.
- [ ] A deterministic hosted smoke case proves app/orchestrator → worker → validation → persistence.
- [ ] A provider-assisted hosted smoke case proves the same chain and records bounded usage evidence.
- [ ] Smoke evidence is tied to the exact deployed SHA and function versions.
- [ ] Smoke execution uses synthetic data and cannot mutate a real household plan.

### FR-2 — Selected household and trusted inputs

- [ ] The client passes the household currently selected in Cooksmith, not an inferred first active household.
- [ ] The server verifies active membership before loading meals, recipes or enrichment.
- [ ] Plan week, meals, servings, recipe versions and enrichment are derived from authorised server data.
- [ ] A caller cannot substitute another household, recipe, week or cached-plan identity.
- [ ] Multiple-household tests prove the selected household remains stable across navigation and retry.
- [ ] Unauthenticated, inactive and unrelated callers receive privacy-safe denial.

### FR-3 — Bounded orchestration, retry and fallback

- [ ] Document one end-to-end timeout budget across outer function, worker, provider, validation and persistence.
- [ ] The outer boundary retains enough budget to return or persist a controlled fallback.
- [ ] Cancellation or lease semantics prevent timed-out work from continuing uncontrolled provider calls.
- [ ] Stable request identity prevents duplicate calls from refresh, navigation, double taps and retry races.
- [ ] Retries are limited to explicitly transient outcomes with bounded attempts and backoff.
- [ ] Deterministic success remains usable when provider, validation, timeout, usage or configuration paths fail.
- [ ] Privacy-safe reason codes distinguish configuration, authentication, authorisation, timeout, provider, validation, persistence, stale input and fallback.
- [ ] Correlation identifiers join operational evidence without exposing provider request IDs to household users.

### FR-4 — Versioned 30-plan evaluation

- [ ] Provide an admin-only **Run 30-plan evaluation** command.
- [ ] Corpus contains exactly 30 versioned representative weekly-plan cases.
- [ ] Corpus includes genuinely ambiguous cross-recipe tasks expected to exercise the provider path.
- [ ] Expected model-call cases fail evaluation if zero model calls occur.
- [ ] Cases cover compatible consolidation, meaningful cut differences, incompatible units, unknown quantities, storage, timing, allergens and raw-protein boundaries.
- [ ] Strict output validation rejects invented recipes, ingredients, quantities, actions, steps and safety rules.
- [ ] Execution is resumable and idempotent for evaluation identity without duplicating provider cost.
- [ ] Partial or failed runs cannot be accepted.
- [ ] Synthetic evaluation content contains no production household identifiers or unnecessary personal data.
- [ ] Every evaluation case exercises multiple planned meals and an explicit time budget.
- [ ] Evaluation fails for malformed cooking fragments, unsafe make-ahead work, low-value filler or a checklist that does not make reasonable use of the available time.

### FR-5 — Evaluation evidence and acceptance

- [ ] Persist corpus, planner, schema, prompt and model identities for every run.
- [ ] Report deterministic, model-assisted and fallback shares.
- [ ] Report structured-output validity, correct/incorrect consolidation review and unsupported-data rate.
- [ ] Report latency distribution, token usage and estimated A$ cost per plan and run.
- [ ] An administrator can inspect case-level safe summaries for failed or review-required outcomes.
- [ ] Acceptance requires explicit confirmation against one completed current run.
- [ ] Acceptance is audited with administrator, timestamp and exact evaluation identity.
- [ ] Corpus, planner, schema, prompt or model changes invalidate stale acceptance.
- [ ] Successful evaluation or acceptance does not automatically enable AI.

### FR-6 — Admin readiness and activation

- [ ] Admin shows configuration, smoke test, evaluation run, evaluation acceptance, emergency stop and activation as a readiness checklist.
- [ ] Each unmet prerequisite shows its exact safe next action.
- [ ] Disabled buttons have adjacent explanatory text and accessible semantics.
- [ ] The page states that 30-plan evaluation means 30 example weekly plans, not a 30-minute session.
- [ ] Command failures render immediately in safe language and are not replaced by a generic retry message.
- [ ] Successful action/refresh clears obsolete errors and cannot restore stale cached state.
- [ ] Only application administrators can run, accept or change weekly-preparation controls.
- [ ] **Enable AI assistance** succeeds only with current configuration, hosted smoke evidence, accepted evaluation and clear emergency stop.
- [ ] Activation requires separate confirmation and creates an audit event.
- [ ] Emergency stop remains independently authoritative before and after enablement.

### FR-7 — Cache and checklist lifecycle

- [ ] Cache identity or invalidation includes household, week/meal-plan version, meals, servings, recipe versions and enrichment versions.
- [ ] AI mode, planner/schema version, prompt version and model identity participate in cache identity or invalidation.
- [ ] Selected duration participates when it changes the generated plan rather than only client presentation.
- [ ] An AI-disabled or temporary fallback cannot suppress a fresh eligible AI-assisted result after activation.
- [ ] A valid current plan is reused on ordinary page views without regeneration.
- [ ] Concurrent requests coalesce or resolve idempotently.
- [ ] Checklist progress survives only when task identities and underlying plan remain compatible.
- [ ] Material plan changes reconcile or reset progress explicitly without silently marking new work complete.

### FR-8 — Household Get Ahead experience

- [ ] The current selected household and explicit preparation date range resolve the correct plan.
- [ ] The date selector defaults to the following Monday–Friday and offers this week, next week and a flexible start/end range.
- [ ] The active checklist always shows its preparation dates and available time.
- [ ] Ending early preserves progress and remains resumable.
- [ ] A user can update the date range or available time and receive a newly fitted checklist.
- [ ] Cooksmith detects material meal, recipe, enrichment or generation changes and automatically reconciles the saved session without requiring the user to remember to replan.
- [ ] Automatic reconciliation preserves completed tasks that still apply, removes obsolete tasks and adds newly eligible work without marking it complete.
- [ ] Household UI distinguishes **AI-assisted plan**, **usual preparation checklist** and **temporary fallback** in calm language.
- [ ] AI-disabled, unavailable or failed states never block the ordinary checklist.
- [ ] **Try again** appears only for a current retryable outcome.
- [ ] Retry uses the current authorised inputs and cannot duplicate provider cost.
- [ ] Provider names, model IDs, request IDs, worker tokens and raw errors never render or enter browser logs.
- [ ] Loading, empty, offline/reconnect, partial and retry states work on supported mobile and desktop sizes.
- [ ] All controls meet WCAG 2.2 AA, keyboard, focus and live-region requirements.

### FR-9 — Telemetry and operations

- [ ] Persist outcome, reason code, latency, model-call indicator, tokens and estimated A$ cost.
- [ ] Distinguish deterministic success, AI-assisted success, controlled fallback and failed orchestration.
- [ ] Routine telemetry excludes recipe text, prompts, provider responses, secrets and unnecessary user/household identifiers.
- [ ] Admin status refresh is bounded, manually refreshable and resistant to stale response races.
- [ ] Operational evidence identifies deployment SHA, function versions, planner/schema/prompt/model identity and evaluation acceptance.
- [ ] Runbook defines preflight, smoke tests, evaluation, review, acceptance, activation, controlled household verification, emergency stop, rollback and forward recovery.

## Data and Domain Direction

Use additive, forward-only database changes to make release evidence and plan outcomes explicit rather than overloading settings or logs.

Expected persisted concepts include:

- versioned evaluation definition and immutable run identity;
- per-case safe outcome/metrics and aggregate run evidence;
- explicit evaluation acceptance tied to complete generation identity;
- generation attempt/outcome with privacy-safe reason, latency and usage;
- request/idempotency identity and selected household/plan version linkage; and
- cache identity containing all material plan and generation inputs.

Prefer database constraints and atomic RPCs for acceptance, activation prerequisites, idempotency and current-plan activation. Keep application-admin authorisation server-side and preserve RLS. Do not place raw recipes, prompts, provider responses or secrets into evaluation/telemetry tables.

## Trusted Boundaries

- Browser calls only authenticated application/orchestrator contracts.
- Server derives and authorises household data before worker dispatch.
- Worker token and provider credentials remain Edge Function secrets.
- Admin commands use the CS-62 application-admin contract on every request.
- Evaluation acceptance and AI enablement are distinct atomic commands.
- Model output is untrusted until strict source/schema validation passes.
- Only validated, current-version plans become active.
- Telemetry failure is best-effort after successful plan activation and cannot convert success into failure.

## Expected Change Surface

- New forward migration(s) under `supabase/migrations/`.
- `supabase/functions/generate-weekly-preparation-plan/`.
- `supabase/functions/get-weekly-preparation-plan/`.
- Function deployment/preflight configuration and protected workflow declarations.
- Weekly preparation domain contracts, adapters, repositories and cache identity.
- Admin weekly-preparation readiness/evaluation UI.
- Household Get Ahead outcome, fallback and retry UI.
- Generated database types.
- pgTAP/RLS/security tests, application tests and Playwright/axe coverage.
- Versioned synthetic 30-plan corpus and hosted smoke/evaluation tooling.
- Operations runbook, implementation report and handover.

## Test Plan

### Application and domain

- [ ] Selected-household propagation and multi-household switching.
- [ ] Reason-code mapping and privacy-safe user/admin messages.
- [ ] Deterministic, AI-assisted, temporary fallback and hard-failure outcomes.
- [ ] Cache identity across AI mode and all generation versions.
- [ ] Concurrent generation, repeat navigation, double action and retry idempotency.
- [ ] Checklist-progress compatibility and material-plan reconciliation.
- [ ] Readiness checklist, action gating, confirmation, error display and stale-error clearing.
- [ ] Household outcome labels, retry eligibility and diagnostics non-exposure.

### Edge Function and integration

- [ ] Missing/invalid configuration fails preflight without secret exposure.
- [ ] Authorised selected-household loading and cross-household denial.
- [ ] Timeout, cancellation, bounded retry and no-orphan-provider-work behaviour.
- [ ] Strict model-output validation and controlled deterministic fallback.
- [ ] Atomic current-plan activation and best-effort telemetry.
- [ ] Stable idempotency under repeated and concurrent requests.
- [ ] Evaluation execution, resume, partial failure and zero-model-call enforcement.

### Database and security

- [ ] Evaluation/run/case/acceptance constraints and version invalidation.
- [ ] Admin-only run/accept/enable grants and ordinary-user denial.
- [ ] Household plan/result isolation and identifier-substitution resistance.
- [ ] Current cache/plan uniqueness and stale-version activation rejection.
- [ ] Telemetry privacy contract and API allowlist coverage.
- [ ] Generated database types are current.

### Hosted journey

1. Deploy exact candidate SHA to the non-production environment with required configuration.
2. Run deterministic smoke case and verify persistence/outcome.
3. Run provider-assisted ambiguous smoke case and verify validation, usage and cost evidence.
4. Run the versioned 30-plan evaluation and confirm expected cases make model calls.
5. Review safe evidence and accept the exact evaluation as an authorised admin.
6. Enable AI and verify a controlled synthetic household Get Ahead plan.
7. Confirm cache transition from AI-disabled fallback to AI-assisted output.
8. Confirm ordinary household and unauthenticated callers cannot access admin operations.
9. Exercise timeout/provider failure and verify deterministic fallback and safe retry.
10. Verify mobile, desktop, keyboard, focus, live-region and overflow behaviour.

Production data is not valid Preview evidence.

## Quality Gates

- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run db:config:check`
- [ ] Local Supabase reset, lint, pgTAP/RLS/security and generated-type freshness
- [ ] Relevant Playwright, axe and responsive coverage
- [ ] Secret, dependency, whitespace and PR-governance checks
- [ ] Hosted deterministic and provider-assisted smoke evidence
- [ ] Versioned 30-plan evaluation evidence and review
- [ ] No production activation, evaluation or household generation during implementation

Unavailable Docker, browser or hosted gates must be recorded honestly and completed in CI/Preview before implementation approval.

## Release Plan

This package PR contains no migration, Edge Function or production deployment. The future implementation release must use one approved `main` SHA:

1. Confirm required configuration through protected deployment preflight.
2. Apply additive migration(s) and verify history, grants, RLS, contracts and generated types.
3. Deploy `generate-weekly-preparation-plan` from the same SHA.
4. Deploy `get-weekly-preparation-plan` from the same SHA.
5. Deploy and verify the application from the same SHA.
6. Keep weekly-preparation AI disabled.
7. Run deterministic and provider-assisted hosted smoke tests.
8. Run the production 30-plan evaluation.
9. Review quality, safety, fallback, latency, tokens and estimated A$ cost.
10. Explicitly accept the current evaluation.
11. Explicitly enable AI assistance.
12. Generate one controlled household plan and verify result, cache and telemetry.

Evaluation, acceptance, activation and controlled household generation affect production/provider spend and each requires explicit operator action after deployment. Merge must not trigger them automatically.

## Rollback and Recovery

- Activate emergency stop to prevent new AI work.
- Disable AI assistance while leaving deterministic Get Ahead available.
- Preserve evaluation, generation, telemetry and audit evidence.
- Revert application/function routing where safe; use forward migrations for database corrections.
- Invalidate or supersede unsafe cache identities without deleting source plans or recipe data.
- Resume only after root cause, household isolation, output safety and cost exposure are understood.

## Cost and Dependency Impact

- Package PR: A$0/month and A$0/year; documentation only.
- No new dependency, provider or paid service is approved by this package.
- Future provider usage stays within existing OpenAI controls and must be measured in the smoke test and 30-plan evaluation.
- The implementation PR must state measured A$ cost per evaluation, per model-assisted weekly plan, monthly assumption and annual assumption before activation.

## Definition of Done

- [ ] All Jira and package criteria are met.
- [ ] Selected household and all plan inputs are authorised server-side.
- [ ] Deterministic and provider-assisted hosted chains are proven.
- [ ] Timeout, retry, idempotency and fallback paths prevent duplicate or uncontrolled cost.
- [ ] The 30-plan corpus exercises ambiguous provider-assisted decisions.
- [ ] Evaluation evidence is complete, safe, versioned and explicitly accepted.
- [ ] Admin activation is gated, understandable, auditable and free of stale errors.
- [ ] Cache identity cannot retain obsolete AI-disabled fallback after activation.
- [ ] Household Get Ahead remains usable and privacy-safe in every outcome.
- [ ] Database, security, application, Edge Function and browser coverage passes.
- [ ] Runbook, report, generated types and handover are current.
- [ ] Implementation PR declares every migration, Edge Function, configuration prerequisite, test limitation, cost and deployment/operator step.
- [ ] Jira and package move through the AIEOS lifecycle.

## PR Requirements

Package PR title: `chore(package): CS-94 — Get Ahead AI release readiness`

Implementation PR title: `CS-94: Make Get Ahead AI generation safe to evaluate, activate and operate`

Both PRs must link [CS-94](https://smillins.atlassian.net/browse/CS-94). The package PR is documentation-only and declares **Migrations in this PR: no** and **Edge Functions changed in this PR: no**. The implementation PR must list every migration, both weekly-preparation Edge Functions, configuration prerequisite, baseline, RLS evidence, test/Preview evidence, unrun checks, cost, deployment order, explicit evaluation/acceptance/activation actions, rollback and limitations.
