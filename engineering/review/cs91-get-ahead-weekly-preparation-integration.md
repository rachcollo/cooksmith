# Engineering Package — CS-91: Get Ahead weekly preparation integration and AI controls

## Metadata

- **Milestone:** Get Ahead
- **Jira issue:** CS-91
- **Epic:** CS-64 — Get Ahead AI Preparation Assistant
- **Status:** `In Review`
- **Implementation branch:** `feat/cs-91-get-ahead-weekly-preparation-integration`
- **Depends on:** CS-81 weekly preparation consolidation and CS-62 admin portal and feature toggles
- **Builds on:** CS-65 to CS-69 Get Ahead opportunity, session, ranking, consolidation and checklist contracts; CS-90 Recipe Intelligence
- **Package path:** `engineering/review/cs91-get-ahead-weekly-preparation-integration.md`

## Product Outcome

Connect the released CS-81 weekly preparation planner to the existing Get Ahead journey so a household can naturally test and use consolidated preparation guidance through Cooksmith instead of constructing technical Edge Function requests.

The household experience must remain calm and practical. It should present trustworthy preparation work, recipe attribution and important safety or storage guidance, not provider terminology. Authorised operational users need a separate protected view for AI enablement, emergency stop and the evidence required to decide whether model-assisted consolidation is safe and cost-effective.

## Current Baseline

At baseline commit `b548220`, Get Ahead loads the active household's planned meals and recipes, derives deterministic preparation opportunities in the browser, creates a duration-fitted checklist, and persists session progress in household-and-week-scoped local storage.

CS-81 has added:

- a provider-neutral, versioned weekly preparation domain contract;
- deterministic candidate consolidation and strict model-decision validation;
- household-scoped cached plans in `cooksmith.weekly_preparation_plans`;
- service-only runtime settings in `cooksmith.weekly_preparation_settings`;
- the protected `generate-weekly-preparation-plan` Edge Function; and
- a synthetic 30-plan evaluation harness.

The existing Edge Function trusts a worker token and supplied candidate payload. That contract is suitable for a trusted worker, not direct browser use. The browser must not receive the worker token or become responsible for authoritative household scope, recipe versions or enrichment data.

CS-62 defines the approved server-authorised admin role, protected route, typed feature-toggle service and audit evidence. CS-91 must consume that foundation. It must not introduce a parallel admin identity or rely on an email address, hidden UI, local state or editable user metadata for authorisation.

Implementation must begin from the latest accepted `main`, recheck every referenced surface, and follow the Product Principles, AIEOS lifecycle, Codex build rules and applicable development, database, testing, accessibility, security and release standards.

## Scope

### Included

- A trusted application-facing orchestration boundary that derives the active household, current planned meals, servings, recipe versions and validated active Recipe Intelligence server-side.
- Invocation of the existing CS-81 worker without exposing `WEEKLY_PREPARATION_WORKER_TOKEN`, `OPENAI_API_KEY`, service-role credentials or trusted candidate construction to browser code.
- Mapping of a validated CS-81 plan into the existing Get Ahead opportunity, duration-fitting and checklist/session flow.
- Reuse of CS-81 cached plans on ordinary page views and regeneration only when its approved version inputs change.
- Safe fallback to the existing deterministic Get Ahead opportunity path whenever enriched input, the orchestration boundary, AI or a validated CS-81 result is unavailable.
- Preservation of recipe attribution, source references, quantities, preparation distinctions, storage/timing/safety guidance and recipe-specific subtasks.
- Compatibility between saved checklist progress and a stable CS-81 plan/cache version.
- Loading, empty, partial, retry, reconnect and stale-session behaviour for the integrated flow.
- A CS-62-protected Weekly preparation operations section for AI enablement, emergency stop, configured model identity, audit evidence and privacy-safe evaluation summaries.
- A protected way to run or inspect the approved synthetic 30-plan evaluation, including ambiguous examples such as chop versus dice, without accepting arbitrary household recipe content.
- Accessibility, responsive, security, database, contract, integration, browser and hosted Preview evidence.

### Explicitly Out of Scope

- Changing the CS-81 consolidation algorithm, schema or provider-neutral model contract unless a confirmed integration defect requires a separately reviewed correction.
- Re-enriching or silently rewriting approved recipes.
- Free-form prompts, chat, recipe generation or user-visible AI controls.
- A second admin portal, administrator identity model or feature-toggle store.
- General analytics, experimentation, percentage rollout or a paid feature-flag service.
- Allowing operational users to inspect raw provider payloads, secrets or unnecessary household recipe content.
- Automatically enabling AI in Production or bypassing cost, evaluation or release approval.
- Migrating all local Get Ahead sessions to server persistence unless required to meet the approved plan-version/progress contract; any broader session persistence redesign needs separate scope.

## Architecture and Trust Boundaries

### Household request path

1. The authenticated user opens Get Ahead for the active household and current plan period.
2. The application calls a protected Cooksmith orchestration endpoint with only the minimum user-selected context, such as the target plan period.
3. The trusted boundary derives user identity and household membership from the verified session. It loads planned meals, servings, exact recipe versions and validated active enrichment itself.
4. It constructs bounded CS-81 candidates with stable source references and invokes the existing worker using server-held credentials.
5. CS-81 returns a cached, deterministic, model-assisted or safe-fallback plan.
6. The trusted boundary validates the response contract and returns only the household-safe plan fields required by Get Ahead.
7. Get Ahead maps those fields into duration ranking and checklist tasks. If any integration stage is unavailable or invalid, it uses the existing deterministic opportunities without blocking the user.

The client must never be able to select another household by changing a request body, fabricate trusted enrichment, pass arbitrary candidates to the worker, or read service configuration.

### Cache, invalidation and session identity

- Reopening Get Ahead with the same plan, servings, recipe versions, enrichment versions, planner version and schema version reuses the CS-81 cache.
- Ordinary navigation, duration selection, checklist completion and resume do not regenerate the weekly plan.
- A new relevant version produces a new CS-81 cache identity without mutating an earlier immutable result.
- Get Ahead session snapshots record the weekly preparation plan/cache identity used to create their tasks.
- Reopening the same identity resumes progress.
- When the plan identity changes, completed work must not be silently lost or incorrectly applied. Reconcile only tasks with stable, unchanged source identity; otherwise explain that the weekly preparation guidance changed and require the minimum safe user choice.
- A failed refresh continues to expose the last safe usable session or the deterministic fallback according to the current session contract.

### Admin and evaluation path

- CS-62 is the only administrator authorisation source.
- Admin reads and mutations use protected server/database functions with least privilege and append-only audit evidence.
- The UI may show `ai_enabled`, `emergency_stop`, a server-controlled model identifier, last-updated metadata and privacy-safe aggregate results.
- It must not return provider keys, worker tokens, service-role values, raw prompts/responses or sensitive runtime environment details.
- Enabling AI and clearing or activating the emergency stop require explicit confirmation and an accessible result announcement.
- Emergency stop must take precedence over ordinary AI enablement.
- The approved 30-plan evaluation uses version-controlled synthetic fixtures. It must not become an endpoint for arbitrary prompts or untrusted household data.
- Evaluation results must identify schema/planner/model/pricing versions and the time of measurement so quality and A$ cost evidence remain interpretable.

## Functional Requirements and Acceptance Criteria

### FR-1 — Trusted CS-81 orchestration

- [ ] The browser invokes an authenticated Cooksmith boundary and never calls the worker with `WEEKLY_PREPARATION_WORKER_TOKEN`.
- [ ] User identity and active-household membership are derived at the trusted boundary.
- [ ] Planned meals, servings, recipe versions and active enrichment are loaded server-side rather than trusted from client-supplied candidates.
- [ ] Requests for another household, unauthenticated requests and inactive/non-member access are denied.
- [ ] Candidate count, payload shape and processing time remain bounded consistently with CS-81 limits.
- [ ] Worker, provider and service-role credentials never appear in browser bundles, network responses, logs, telemetry, fixtures or error copy.

### FR-2 — Get Ahead integration

- [ ] Opening Get Ahead for a planned week resolves the corresponding validated CS-81 weekly preparation plan.
- [ ] Compatible preparation is displayed once with correct combined quantities and recipe attribution.
- [ ] Meaningful differences in cut, unit, timing, storage, food safety or recipe component remain separate and understandable.
- [ ] Parent tasks and recipe-specific subtasks map into the existing duration fitting, ranking, checklist and progress experience without losing traceability.
- [ ] Storage, timing and safety guidance supplied by the validated plan is rendered semantically and without unsupported new claims.
- [ ] The household-facing UI describes useful work and impact without exposing model names, token counts, validation jargon or provider errors.
- [ ] Existing skip, defer, complete, reopen, end-early and resume behaviours remain available where applicable.

### FR-3 — Cache, invalidation and durable progress

- [ ] Repeated views and ordinary navigation reuse the same valid CS-81 cache identity.
- [ ] Changing duration or checklist progress does not regenerate the weekly plan.
- [ ] Relevant meal, serving, recipe or enrichment changes cause the next trusted request to resolve the new plan/cache identity.
- [ ] Saved Get Ahead progress is tied to the plan identity that produced its tasks.
- [ ] Reopening the same plan identity preserves task progress.
- [ ] A changed plan identity never silently carries completion to a materially changed task or silently discards completed work.
- [ ] Automated evidence proves cache hits and invalidation across all CS-81 version inputs.

### FR-4 — Safe fallback and recovery

- [ ] Missing enrichment continues through the supported deterministic candidate path.
- [ ] AI disabled, emergency stop, timeout, provider failure, invalid model output or usage limit returns a usable deterministic/fallback plan.
- [ ] Orchestration, network or persistence failure preserves the existing deterministic Get Ahead experience rather than blocking meal preparation.
- [ ] Loading, empty, partial, offline/reconnect and retry states preserve context and avoid duplicate sessions or requests.
- [ ] Raw Edge Function, provider, database and validation errors are never shown to household users.
- [ ] Fallback telemetry uses bounded reason codes and excludes secrets and unnecessary household content.

### FR-5 — Admin AI controls

- [ ] Only a CS-62-authorised administrator can open the Weekly preparation operations surface.
- [ ] The admin can see AI-enabled and emergency-stop state, configured model identifier, last-updated time and the outcome of their most recent mutation.
- [ ] The admin can enable or disable AI and activate or clear the emergency stop through a protected mutation with explicit confirmation.
- [ ] Emergency stop overrides AI-enabled state at the worker boundary.
- [ ] Every settings mutation records the authorised actor, action, previous and new safe state, timestamp and correlation identity without recording secrets.
- [ ] Unauthenticated, non-admin, inactive and unrelated household users cannot read or mutate configuration or evaluation evidence.
- [ ] UI hiding is not treated as authorisation.

### FR-6 — Hosted evaluation and ambiguous examples

- [ ] An authorised administrator can run or inspect the versioned synthetic 30-plan evaluation through a protected operational path.
- [ ] Results report deterministic share, model-call share, structured-output validity, accepted/rejected/fallback outcomes, reviewed consolidation correctness, unsupported-data rate, latency, token usage and estimated A$ cost per plan.
- [ ] Results identify schema, planner, model and pricing versions and do not claim a real hosted result when only deterministic or mocked execution ran.
- [ ] The corpus includes chop-versus-dice equivalence/meaningful-difference examples, incompatible units, unknown quantities and timing/storage/safety boundaries.
- [ ] The UI makes clear whether an ambiguous model decision was accepted, rejected or safely fell back.
- [ ] No raw household recipe text, provider prompt/response, secret or user-identifying data is required to review the evaluation.
- [ ] Unsafe or invented guidance remains release-blocking and cannot be overridden from the UI.

### FR-7 — Accessibility and product quality

- [ ] Household and admin experiences use Australian/UK English, semantic headings, useful accessible names and colour-independent status.
- [ ] All controls are keyboard operable with visible focus, appropriate confirmation/focus return and at least 44px touch targets.
- [ ] Status changes and mutations are announced without moving focus unexpectedly.
- [ ] Loading and errors avoid layout shifts that obscure the active task.
- [ ] Supported 320px, 390px, tablet and desktop widths have no horizontal overflow.
- [ ] Reduced-motion and high-contrast/forced-colour behaviour remains usable.

## Data, Security and Privacy

- Prefer the smallest additive persistence change. Reuse CS-81 cache/settings and CS-62 authorisation, typed flags and audit contracts where they satisfy this package.
- If Get Ahead needs a durable link between a session and the CS-81 cache identity, add it through a forward-only migration with explicit backward-compatible handling for existing local/session data.
- Do not expose `weekly_preparation_settings` directly to authenticated clients. Its current service-only grants remain the minimum baseline.
- Use an explicit allow-list for admin-readable settings fields and evaluation aggregates.
- Validate all client input and all worker output at the trusted boundary.
- Preserve CS-81 source references internally while returning only fields required for the household checklist.
- Use synthetic fixtures only. Do not copy real recipes, household IDs, authentication tokens or production telemetry into the repository.
- Add adversarial tests for cross-household access, client-forged household/candidate/version input, non-admin configuration access and secret non-exposure.
- Record an ADR only if implementation requires a durable decision not already covered by CS-62, CS-81 or accepted architecture.

## Technical Direction

- Prefer a thin orchestration Edge Function or equivalent existing trusted server boundary over placing service credentials in the Vercel client.
- Reuse the CS-81 domain types and validation code. Do not create a second weekly preparation result model.
- Extend the Get Ahead domain through an explicit adapter from validated weekly plan tasks to session opportunities/task snapshots. Keep mapping and reconciliation framework-independent and unit-testable.
- Preserve the current deterministic `analysePreparationOpportunities` path as the integration fallback until hosted evidence supports removal in separate scope.
- Coalesce duplicate page-load requests and guard stale asynchronous responses when the household or week changes.
- Do not run provider evaluation during ordinary page views.
- Prefer aggregate evaluation evidence derived from versioned results. If new persistence is required, define retention, access and deletion behaviour and keep raw payloads out by default.
- Reuse CS-62 route protection, configuration service, mutation confirmation and audit patterns. CS-91 must remain blocked until CS-62 is Done or its accepted implementation is present on `main`.

## Test Plan

### Domain and adapter tests

- CS-81 parent tasks/subtasks map to Get Ahead tasks with stable IDs, quantities, source recipes, order, reason and guidance.
- Compatible preparation remains consolidated; diced, finely diced, roughly chopped, sliced, minced and grated distinctions remain visible.
- Unknown quantities stay unknown and incompatible dimensions remain separate.
- Duration selection and ranking operate on the mapped plan without triggering regeneration.
- Same plan identity resumes progress; changed identity reconciles only provably unchanged tasks.
- Invalid or incomplete CS-81 output is rejected and uses deterministic fallback.

### Trusted-boundary and integration tests

- Authenticated member success for active household and current plan.
- Unauthenticated, inactive member, non-member and forged-household denial.
- Server-side recipe/version/enrichment derivation and rejection of client-forged candidates.
- Cache hit, meal/serving/recipe/enrichment invalidation and duplicate-request coalescing.
- AI disabled, emergency stop, timeout, malformed model output, provider error, persistence error and orchestration error.
- Worker token/service-role/provider key absent from client assets, responses, snapshots and logs.
- Existing deterministic Get Ahead remains usable throughout backend failures.

### Admin, database and security tests

- CS-62 admin read/mutation success and unauthenticated/non-admin denial.
- AI enable/disable and emergency-stop precedence.
- Append-only settings audit evidence and safe allow-listed response shape.
- Evaluation visibility uses synthetic fixtures and returns aggregate/version metadata only.
- RLS, least-privilege grants, database constraints, pgTAP and generated-type freshness for any schema change.
- Secret scan, production dependency audit and browser-bundle inspection.

### Browser, responsive and accessibility tests

- Start, resume and complete a Get Ahead checklist backed by a deterministic CS-81 result.
- Ambiguous hosted fixture produces model-assisted or safe-fallback evidence without changing household copy.
- Loading, no planned meals, partial enrichment, retry, offline/reconnect and stale-plan states.
- Keyboard-only household and admin journeys, focus after confirmation, live status announcement and error recovery.
- Axe and responsive checks at 320px, 390px, tablet and desktop widths.

## Hosted Preview and Evaluation Plan

Use the exact Vercel Preview with the Preview Supabase project only. Do not connect CI or Preview to Production.

1. Deploy any accepted additive migration, the existing CS-81 worker and the new trusted orchestration/admin function to Preview in documented dependency order.
2. Configure Preview-only runtime secrets and confirm none appear in the browser.
3. Use synthetic household accounts representing an authorised member, another-household member and CS-62 administrator.
4. Verify deterministic Get Ahead output with AI disabled, including cache reuse after reload and progress resume.
5. Verify an enrichment or service failure returns the existing deterministic checklist.
6. Run the synthetic ambiguous chop/dice evaluation with AI enabled, confirm accepted/rejected/fallback evidence and inspect A$ cost/latency metrics.
7. Activate emergency stop and prove the same ambiguous case falls back without a model call.
8. Prove non-admin and cross-household denial.
9. Complete keyboard, responsive and axe checks.

Do not enable AI for ordinary Production use until the hosted 30-plan evidence is reviewed, safety and consolidation quality are accepted, estimated A$ cost is approved and emergency stop is verified.

## Quality Gates

- [ ] `npm ci` and `npm run preflight` complete from the supported baseline.
- [ ] `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] `npm run docs:commands:check`, whitespace, credential scan and production dependency audit pass.
- [ ] Applicable database reset, lint, pgTAP, RLS/security contracts and generated database types pass.
- [ ] Edge Function/domain contract tests and client secret non-exposure checks pass.
- [ ] Playwright, axe, responsive and keyboard coverage pass for changed household/admin surfaces.
- [ ] Hosted Preview household, fallback, admin, ambiguous-evaluation and emergency-stop flows are completed with synthetic data.
- [ ] Thirty-plan hosted evaluation and explicit quality/safety/A$ cost acceptance are recorded before AI enablement.
- [ ] PR governance, Jira evidence, release declarations, completion report and handover are complete.

## Definition of Done

- [ ] Every Jira and package acceptance criterion is implemented and evidenced without excluded scope.
- [ ] Households can use CS-81 through Get Ahead with no technical setup and a safe deterministic fallback.
- [ ] Stable plan identity, cache reuse, invalidation and checklist progress behaviour are proven.
- [ ] CS-62 authorisation protects all AI settings and evaluation operations.
- [ ] Secrets remain server-side and household/admin isolation is proven adversarially.
- [ ] Accessibility, responsive, security, privacy, evaluation and cost obligations are satisfied.
- [ ] Required GitHub Actions and hosted Preview evidence pass.
- [ ] AI remains disabled by default until the explicit hosted release gate is accepted.
- [ ] Jira can progress through AIEOS using the package, PR and release evidence.

## Implementation Sequencing

1. Confirm CS-62 and CS-81 accepted contracts on the latest `main`; stop if CS-62 is not Done.
2. Define the trusted application-facing request/response and server-derived candidate contract.
3. Implement household/plan/recipe/enrichment derivation and secure worker invocation.
4. Add the framework-independent weekly-plan-to-Get-Ahead adapter and deterministic fallback.
5. Integrate loading, cache identity, invalidation and session progress/reconciliation into Get Ahead.
6. Extend the CS-62 admin surface with weekly preparation settings, evaluation evidence and audited mutations.
7. Add database/Edge Function changes only where the confirmed baseline requires them, then update generated types and release declarations.
8. Complete domain, integration, adversarial, browser, responsive and accessibility validation.
9. Deploy the accepted Preview dependencies and complete deterministic, ambiguous, fallback and emergency-stop hosted validation.
10. Record the hosted 30-plan review and A$ cost decision. Do not enable Production AI without approval.

## Release, Rollback and Cost

- **Expected migration:** Likely. CS-62 may already provide admin/audit persistence; CS-91 may need additive evaluation evidence and/or Get Ahead plan-identity persistence. Confirm against accepted `main`. The package PR contains no migration and does not deploy Production.
- **Expected Edge Function:** Yes. Add or extend a trusted authenticated orchestration/admin boundary; reuse the released `generate-weekly-preparation-plan` worker rather than exposing it to the browser. The package PR contains no Edge Function change.
- **Production database release:** Required after the implementation PR is merged if a migration is added, through the protected workflow using the exact accepted `main` SHA, dry-run and migration-history verification.
- **Production Edge Function release:** Required after merge for each changed function, after database prerequisites, through the protected workflow.
- **Application release:** Human-approved merge to `main`, with backend release order and configuration explicitly recorded.
- **Rollback:** Disable AI or activate emergency stop, disable/revert the application integration to the existing deterministic Get Ahead path, preserve immutable cached/evaluation data, and forward-fix any released schema. Never edit an accepted migration.
- **New dependency/provider:** None expected. Use the already approved OpenAI adapter and existing platform/dependencies. Any new dependency must be exact-versioned, justified and audited.
- **Package-only PR cost:** A$0/month and A$0/year.
- **Implementation recurring cost:** Deterministic integration is A$0 incremental provider cost. Model-assisted usage is variable and must be measured per plan, projected monthly/annually and explicitly accepted before broad enablement.
- **Secrets:** Existing `OPENAI_API_KEY`, `WEEKLY_PREPARATION_MODEL` and `WEEKLY_PREPARATION_WORKER_TOKEN` remain trusted runtime secrets only. Never expose or duplicate their values.

## PR Requirements

Package PR title: `chore(package): CS-91 — Get Ahead CS-81 integration`

Implementation PR title: `CS-91: Connect weekly preparation plans to Get Ahead`

Both PRs must link [CS-91](https://smillins.atlassian.net/browse/CS-91) and this package as applicable. The implementation PR must state the approved outcome, preserved deterministic behaviour, exact baseline, changed files, real test and hosted-evaluation results, migrations, Edge Functions, Preview and Production release order, rollback, security/privacy/accessibility review, provider/model configuration and measured per-plan/monthly/annual A$ cost.
