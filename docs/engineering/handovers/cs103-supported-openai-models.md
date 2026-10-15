# CS-103 handover: supported OpenAI models

- **Date:** 2026-10-15
- **Branch:** `feat/cs-103-supported-openai-models`
- **Target/baseline:** `main`, `a2d08425edd7d28aec15a8d64f8e688b921e0ee5`
- **Package:** `engineering/ready/cs103-supported-openai-models.md`
- **Status:** Implementation in review; model-backed and hosted acceptance pending. No activation authorised.

## Outcome and architecture

Maintain the existing food-intelligence chain through provider retirements. Import extracts source recipes deterministically; a successful save queues shared recipe enrichment; Get Ahead consumes validated recipe-level opportunities and applies deterministic eligibility and source checks around weekly model decisions. No new agent, provider, data schema, user input, or product feature is introduced. Principles: reduce household effort, preserve trust and source provenance, keep costs bounded.

Accepted ADR012 retains reusable recipe intelligence; ADR013 requires calm unavailable/preparing states when no current model-assisted plan exists. The older generic deterministic-checklist fallback guidance is superseded for Get Ahead. No accepted ADR is changed.

## Verified inventory and limitations

Checked remote and local main on 15 October; fetch confirmed the baseline above and a clean tree before branching. No `.agents` skills were present in the selected workspace.

| Surface                           | Evidence                                                                                     | Migration impact                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Production import-recipe v84      | Deployed source has no OpenAI model reference                                                | No import model to replace; validate downstream save/enrichment                              |
| Production enrich-recipe v131     | Deployed and main source read RECIPE_INTELLIGENCE_MODEL, with gpt-5-mini-2025-08-07 fallback | Replace fallback; separately switch the deployed override after approval                     |
| Stored enrichment provenance      | Aggregate read: 146 gpt-4.1-mini results and 110 deterministic results                       | Evidence of prior execution, not a read of today's secret override; preserve valid results   |
| Production weekly worker v127     | WEEKLY_PREPARATION_MODEL must equal database model_identifier                                | Both settings must change together during approved cutover                                   |
| Production weekly settings        | gpt-4.1-mini; AI enabled, emergency stop false; prompt/corpus v13; pricing openai-aud-v1     | New model, prompt/profile and pricing identity; new acceptance                               |
| Production evaluation v91         | Same weekly adapter/env, records model/prompt/pricing/deployment and 30 cases                | Existing 29/30 acceptance does not approve Luna                                              |
| Production household wrapper v129 | Authenticated recipe-readiness and worker orchestration                                      | No model constant; staging validates entire chain                                            |
| Actual Edge secret values         | Not exposed by the available connector                                                       | Verify selected non-secret model/rate values during approved operator setup; never dump keys |
| OpenAI project permission         | No OpenAI credential available locally for a read-only GET model probe                       | Model availability/permission remains unverified; do not generate credentials                |

These were read-only metadata/source/configuration queries. No recipe content, household identifiers, secrets, enrichment jobs or settings were changed.

## Official retirement and candidate decision

[OpenAI API deprecations](https://developers.openai.com/api/docs/deprecations) confirms the 14 October notice: specified GPT-4o/4o-mini/4.1/4.1-mini snapshots shut down **14 January 2027**; recommended replacement is `gpt-6-luna`. The deployed alias is gpt-4.1-mini; do not rely on an alias surviving its underlying family shutdown. Separately, the fallback gpt-5-mini-2025-08-07 retires **11 December 2026**. This is API retirement, not ChatGPT subscription/product retirement.

[GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) supports Responses and structured outputs; use its documented identifier (no invented dated snapshot). Proposed profile: low reasoning, 16,384 maximum output tokens for enrichment, 8,192 for weekly planning/evaluation, store:false. Output budgets include reasoning tokens. Existing strict schemas and source validators remain authoritative. No temperature, top_p, max_tokens or max_completion_tokens are added. [GPT-6 migration guide](https://developers.openai.com/api/docs/guides/latest-model) documents reasoning and sampling compatibility.

Luna is the efficient focused-task candidate, not yet a measured quality/latency winner. Low reasoning avoids the undocumented cost of accepting a changing default; compare latency and success against existing timeouts in the paid trial. [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), the listed old GPT-5-mini successor, costs US$2/$12 per million input/output tokens and is not justified for this bounded structured task without evidence Luna fails. Larger models or fallback routing are outside scope.

## Implementation

Shared server-only `_shared/openaiProfile.ts` supplies Luna request options and completed-output validation to both adapters. Legacy configured models retain their previous request options for comparison/rollback before retirement. The enrichment default is Luna; explicit deployed overrides still take precedence.

Luna weekly requests and evaluation require `weekly-preparation-strategy-v13-luna-low-v1`. The worker checks this before cache lookup. Model and prompt already participate in its cache key and database acceptance identity, so changing either avoids old cached results and old acceptance. Future reasoning/budget changes must advance this profile identity and re-evaluate.

Both adapters reject incomplete/refused/multiple-output responses before parsing JSON, including parseable partial JSON. Existing safe error categories, timeouts, transient retry boundaries and deterministic validators remain. No migrations, generated types, dependencies, UI or permissions change.

## Cache, provenance and compatibility

- Existing accepted enrichment results remain usable with their old model provenance. Retirement does not invalidate stored food data. Do not queue a blanket re-enrichment or rewrite model labels.
- New jobs use the configured model but retain the existing idempotent provider-assisted job identity. A model-only switch intentionally does not requeue completed recipes. Use the existing explicitly approved bounded reprocessing path for a selected comparison corpus only.
- Weekly cache keys already include model, prompt, corpus, planner and source/enrichment identities. No cache-table deletion is needed. A mixed valid old-enrichment/new-weekly-model chain must be included in acceptance.
- GetAheadPage compares returned cacheKey against persisted sessions, reconciles changed sessions and removes them when the plan is unavailable. An already open tab is not immediately refreshed by a server setting change: hosted checks must cover reopen/reload and preservation of completed tasks. This is not a new push-invalidation mechanism.
- Evaluation is NOT a read-only health check: it records runs/cases and can patch settings. Do not invoke it to discover configuration or permissions. Its automatic model alignment does not replace the explicit profile/pricing setup and activation gate.

## Costs and approval

Standard published prices per million tokens, checked 15 October: Luna US$0.10 input / US$0.50 output; cached input US$0.01. [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini) is US$0.40 / US$1.60. Token rates decrease, but reasoning/output lengths and retries can change total cost; savings are not guaranteed.

Illustrative forecast, not measured usage: 100 enrichments/month at 3,000 input + 2,000 total output tokens each, plus 200 weekly plans at 5,000 input + 1,000 total output each, gives US$0.33/month. At an explicitly assumed US$1=A$1.60 (not a live FX quote), that is about **A$0.53/month, A$6.34/year**, excluding taxes, retries and cache writes. Ten times this workload is **A$5.28/month, A$63.36/year**. Fixed incremental infrastructure/subscription cost **A$0/month, A$0/year**.

Before any paid validation, obtain an explicit environment and budget approval (proposed ceiling A$2 for a small synthetic enrichment corpus plus the 30-plan evaluation, with no automatic rerun). Estimate actual input sizes and maximum output charges before starting; stop if the ceiling cannot be guaranteed. Provider output usage includes reasoning. Existing shared AUD rate variables must be updated consistently for both stages, with an approved FX assumption and new pricing_version; never carry old rates into a claim of measured Luna cost. Preserve current daily/monthly controls. No paid call was made for implementation.

## Approved-release runbook (not executed)

1. Review draft/CI and approve model-backed testing budget/environment. Using the existing authorised OpenAI project credential, make a non-billable model-retrieve request to verify access; do not log or create credentials. Read model/rate configuration only, not keys. Check project limits/model allow-list and available capacity.
2. In an approved isolated test environment deploy all three affected functions together: enrich-recipe, generate-weekly-preparation-plan, evaluate-weekly-preparation. Set both model variables to gpt-6-luna and approved AUD rates. Set weekly AI disabled/emergency stop via supported admin controls before changing model_identifier, prompt_version to weekly-preparation-strategy-v13-luna-low-v1, pricing_version to a new dated Luna/FX identity, and clear smoke evidence. Preserve corpus v13 and existing thresholds. Inspect protected-function deployment manifest for shared-file inclusion.
3. Process only an approved synthetic recipe set through the real import/save/enrichment queue. Review strict schema, source references, partial/refusal errors, retries, unknown quantities and stored provenance. Include a safe completed older enrichment consumed by the new weekly model. No global backfill.
4. Run the existing 30-plan evaluation under the approved ceiling. Require existing threshold (at least28/30), all28 expected actual-model cases valid, zero unsupported/fallback results and detailed owner review, including the previous fresh-finishers limitation. Record measured latency, usage/cost, model/profile/pricing/deployment identity. Never label offline fixtures as a model-backed pass.
5. Complete hosted authenticated source-to-checklist checks: quantities/cuts/safety boundaries, reopen cache hit without new provider usage, meal/serving/enrichment invalidation, refusal/timeout/unavailable recovery, model/profile changes and session reconciliation on mobile. Record smoke at the exact deployed commit and accept the new evaluation through existing admin gate before enabling normal use.
6. Obtain separate merge/production release/configuration approval. Capture rollback settings and perform the coordinated cutover under the existing maintenance workflow. No schema migration is expected; do not dispatch database release for this change. Release exact approved main SHA through protected Edge release. Verify all affected functions and actual setting identities, then repeat bounded production acceptance before reopening. Main merge also deploys the frontend; it remains a consequential approval step.
7. Monitor safe metadata for provider rejection, timeout, invalid output, enrichment backlog, latency and cost. Roll back by disabling AI first, restoring known-good model/profile/pricing settings and previous function revision only while that model is still available; re-enable only with matching valid acceptance/smoke. After retirement, keep honest unavailable states and use a supported forward fix. Never restore a retired fallback, erase immutable enrichments or bypass acceptance triggers.

## Validation evidence

Local logs: `/workspace/cooksmith-review/cs103`. Offline HTTP mocks exercise both real adapters, successful usage/provenance, request parameters, incomplete/refused/malformed responses and safe provider failure. Existing domain/evaluation/queue/session tests remain separate deterministic evidence. Results and draft PR/CI links are recorded in the final Jira/PR evidence.

Initial npm installation failed because the default npm cache directory was unavailable; installation was rerun with `/tmp/cooksmith-npm-cache`. Initial preflight lacked the pinned Supabase CLI before installation. These are environment failures, not hidden test passes.

Hosted/model-backed quality, project permission, actual Edge override values and physical-device migration checks remain pending. No auth flow, UI or RLS logic changed; no claim of complete accessibility/security certification. No production mutation, merge, deployment, credential generation or paid evaluation was performed.

### Local results for this change

- `npm ci --cache /tmp/cooksmith-npm-cache`: passed. Pinned Supabase CLI2.109.1 requires `SUPABASE_CLI_BINARY_OVERRIDE=/tmp/cooksmith-supabase-cli/supabase-go` because its wrapper cannot create `/home/agent/.supabase`; preflight passed with that installed pinned binary.
- `npm run format`, `npm run validate:static`: passed; 679 tests in92 files, including15 new real-adapter mocked-HTTP tests. Existing build-size warning remains.
- New adapter imports initially exposed missing test-project file inclusions (TS6307); the test TypeScript project now explicitly includes the shared profile and both adapters. Full typecheck subsequently passed.
- Direct TypeScript check of all three affected Edge entrypoints passed using a temporary declaration of Deno's env/serve interface. This is type validation, not a hosted Deno execution or provider test.
- Package readiness, documentation command audit (195files), database config (71migrations), secret scan and production dependency audit passed; the repository's existing reviewed React Router non-RSC exception remains.
- Local database startup was attempted but interrupted after image extraction exhausted disk space during browser testing. It never reached a usable database; no local reset/SQL/HTTP/type-generation pass is claimed. The unchanged CI database suite remains required. No hosted database was used as a substitute.
- Initial browser run was incomplete: WebKit missing, followed by ENOSPC during the concurrent local database image pull. Database startup was cancelled, space recovered and WebKit installed before a separate browser rerun. Results of that rerun are recorded on the PR/Jira; the interrupted run is retained in local logs.
- Completed browser rerun:48 desktop/mobile Chromium passes,2 existing local-DB opt-in skips,10 WebKit launch failures due to missing native libraries (gtk4, graphene, harfbuzz-icu, manette, hyphen, woff2 and GLES). No WebKit test body ran. Downloading native packages into `/tmp` was attempted but the runner has no usable apt package index; no system packages were changed. This is a recorded local runtime limitation; CI installs browser dependencies.
