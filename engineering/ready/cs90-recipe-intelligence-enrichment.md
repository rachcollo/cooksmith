# Engineering Package — CS-90: Shared Recipe Intelligence enrichment foundation

## Metadata

- **Milestone:** Recipe Library
- **Jira issue:** CS-90
- **Epic:** CS-5 — Recipe Library
- **Status:** `Ready`
- **Implementation branch:** `feat/cs-90-recipe-intelligence`
- **Builds on:** CS-28 lossless recipe structuring and CS-30 URL recipe import
- **Blocks:** CS-81 — AI-assisted weekly preparation plan consolidation
- **Package path:** `engineering/ready/cs90-recipe-intelligence-enrichment.md`

## Product Outcome

Create one trustworthy recipe-level intelligence foundation that preserves the user-approved recipe, enriches it into reusable and traceable culinary metadata, and lets Get Ahead, shopping, pantry matching and later features reason consistently without repeatedly sending full recipes to AI.

Recipe save, import, edit, planning, shopping and current Get Ahead behaviour must remain usable when enrichment is delayed, disabled, rejected, rate-limited or unavailable.

## Current Baseline

Cooksmith preserves structured recipe ingredients and instructions but does not yet own a shared canonical ingredient/action vocabulary, immutable enrichment result, recipe-version-aware processing job or server-side AI provider boundary. CS-81 therefore cannot safely consolidate equivalent cross-recipe work without either duplicating recipe interpretation or relying on raw wording.

Implementation must begin from the latest accepted `main`, recheck all referenced code and migrations, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and the relevant database, testing, security and release standards.

The OpenAI API project and key have been set up. Implementation must reference the runtime secret only as `OPENAI_API_KEY`; never expose, copy, log, commit or validate the secret value from browser or repository code.

## Scope

### Included

- A versioned, provider-neutral Recipe Intelligence domain contract with explicit unknown and confidence states.
- Deterministic parsing, unit normalisation and known-vocabulary mapping before any provider call.
- Canonical ingredient identity while retaining original text, aliases, modifiers and meaningful distinctions.
- Parsed and normalised quantities/units without inventing missing values or converting incompatible dimensions.
- Canonical preparation/cooking actions while retaining meaningful detail such as diced, finely diced, sliced, minced, grated and roughly chopped.
- Stable ingredient-to-step links, ordered action structure, component boundaries and source provenance.
- Prepare-ahead, storage, reheating, food-safety, allergen, cross-contamination, raw-protein and batch-cooking metadata only when supported and validated.
- Asynchronous/version-aware enrichment for imports, manual creation, material edits and controlled reprocessing.
- An authenticated Supabase Edge Function/provider adapter using strict schema-constrained output for unresolved or judgement-dependent fields only.
- Immutable enrichment results, an active-result pointer/state, processing jobs, failure categories, usage/cost telemetry and downstream invalidation.
- Idempotent, resumable, rate-limited backfill for existing recipes.
- Feature flag, emergency kill switch, timeout, bounded retry, concurrency/usage limits and budget telemetry.
- Evaluation over a representative recipe set before CS-81 is unblocked.

### Explicitly Out of Scope

- Weekly cross-recipe consolidation or Get Ahead presentation logic — CS-81.
- Automatically rewriting the approved recipe or replacing original ingredient/instruction text.
- Automatically merging, deleting or rewriting pantry items.
- Nutrition, diagnosis, medical advice or unsupported food-safety claims.
- Conversational AI, user-visible AI chat or free-form recipe rewriting.
- Embeddings, semantic/vector search, fine-tuning, LangChain or multiple autonomous agents.
- A general-purpose admin portal; operational backfill may use a protected script or narrowly scoped server endpoint.
- Treating provider output as authoritative without local validation.

## Source-of-Truth and Versioning Contract

- The approved recipe and its original text remain the editing, display and recovery source of truth.
- Every material recipe edit creates or resolves to an immutable recipe content version/fingerprint before enrichment runs.
- An enrichment result belongs to exactly one recipe ID, household/user authority boundary, recipe content version, schema version, rules/prompt version and model/provider version.
- Enrichment results are immutable and replaceable. A new result becomes active only after complete validation succeeds.
- The previous valid result remains active while a replacement is queued, processing, timed out, rejected or failed.
- Reprocessing the same recipe/rules/schema/model identity is idempotent and cannot create multiple active results.
- Stale workers cannot activate a result for an older recipe version or overwrite a newer valid result.
- Downstream consumers receive only validated active enrichment and can identify its version for caching and invalidation.
- Unknown source facts remain explicitly unknown. Confidence is recorded per field and for the overall result; low confidence never silently becomes fact.

## Enrichment Contract

The implementation may split the contract into normalised relational records and validated JSON, but it must expose one typed application contract containing:

- source recipe ID and version/fingerprint;
- source ingredient/step IDs or stable references and original text;
- canonical ingredient ID/name, aliases and retained modifiers;
- quantity state (`known`, `range`, `approximate`, `unknown`, `not_applicable`), original value, normalised value and unit/dimension;
- canonical action plus retained preparation detail;
- ingredient-to-step links with confidence and provenance;
- ordered actions and recipe component boundaries;
- prepare-ahead suitability and maximum supported lead time;
- storage method, duration, temperature and reheating guidance with evidence state;
- allergen, cross-contamination and raw-protein boundaries needed by downstream grouping;
- batch-cooking suitability and safe component boundaries;
- field-level confidence, reason/evidence code and deterministic/model provenance;
- schema, vocabulary/rules, prompt, model/provider and enrichment versions;
- processing state, safe failure category, timestamps, latency, token usage and estimated cost.

Provider payloads must use strict structured output and stable identifiers supplied by Cooksmith. The model may classify or propose values only inside the supplied schema; it may not add ingredients, quantities, steps, recipe references or unsupported safety instructions.

## Processing Architecture

1. The trusted recipe save/import path commits the user-approved recipe without waiting for AI.
2. After commit, create or upsert a version-aware enrichment job. Duplicate triggers collapse to the same job identity.
3. A worker loads the exact approved recipe version under server-side authority.
4. Deterministic parsing, normalisation and vocabulary rules resolve known fields first.
5. If AI is disabled, unnecessary or unavailable, validation/persistence continues with deterministic and explicit-unknown results.
6. Only unresolved or judgement-dependent excerpts plus stable references are sent through the provider-neutral adapter.
7. The OpenAI adapter runs only in a Supabase Edge Function/trusted server environment and reads `OPENAI_API_KEY` from Edge Function secrets.
8. Strict structured output is parsed and validated against the source recipe, deterministic results, allowed identifiers, unit dimensions and safety rules.
9. Unsupported, invented or internally inconsistent fields are rejected or reduced to unknown; unsafe/invented safety guidance rejects the result.
10. Persist the immutable result, then atomically activate it only when the recipe version is still current and validation has passed.
11. Record privacy-safe metrics and notify/invalidate downstream caches affected by the new active enrichment version.
12. Retry only transient failures within bounded limits; permanent/validation failures remain inspectable and safely reprocessable.

Do not put a long-running provider call inside the browser request or a database transaction. The implementation must document the chosen worker trigger and demonstrate safe duplicate delivery, retry and stale-job behaviour.

## Data and Persistence Direction

Expected additive persistence, with final names confirmed against the current schema during implementation:

- recipe content version/fingerprint support if the current recipe model does not already provide an immutable version identity;
- enrichment job/attempt records with idempotency key, state, retry count, lease/claim metadata and safe failure category;
- immutable enrichment result records with source/version/config identity, confidence summary and usage metrics;
- normalised enrichment fields or schema-validated JSON with stable source references;
- one safe active-result relationship per current recipe version;
- versioned canonical vocabulary/rule records where deterministic mappings require persistence;
- downstream invalidation/version metadata consumable by CS-81.

Requirements:

- additive, timestamped migrations only; never rewrite an accepted migration;
- household/user isolation and least-privilege RLS on every exposed table;
- service-role use confined to the trusted worker boundary and never used as a substitute for explicit ownership validation;
- uniqueness/foreign-key/check constraints enforce idempotency, source references, version identity and one active result;
- indexes support current-result lookup, pending-job claim, backfill progress and stale-attempt diagnosis;
- raw provider request/response bodies are not stored by default;
- generated database types and schema contract documentation remain current;
- pgTAP covers ownership isolation, cross-household denial, constraints, stale activation and privileged-boundary expectations.

## AI Provider and Runtime Controls

- Use a provider-neutral interface in application/domain code; OpenAI is the first adapter, not a domain dependency.
- Use the OpenAI Responses API with strict structured output and an explicitly pinned, server-controlled model identifier.
- Begin with one small, fast model. A stronger-model escalation path is not implemented unless evaluation evidence and separate cost approval justify it.
- `OPENAI_API_KEY` is an Edge Function secret only. It must never use a `VITE_` prefix, be returned to the client, appear in fixtures, logs, telemetry, error messages or documentation values.
- Add server-controlled enablement and emergency kill-switch configuration independent of browser state.
- Configure finite request timeout, bounded retry with jitter for transient errors only, concurrency limit, per-recipe attempt limit and daily/monthly usage guardrails.
- Fail closed for unsupported provider output and fail open for the existing Cooksmith recipe workflow: the user keeps the recipe and deterministic fallback.
- Log only identifiers, versions, timings, outcome categories and aggregated usage/cost data needed for operations. Do not log recipe/provider payloads by default.
- Document secret setup for Preview and Production without printing or checking the value into any client-visible surface.

## Functional Requirements and Acceptance Criteria

### FR-1 — Preserve the approved recipe and existing workflows

- [ ] Import, creation and material edit save successfully without waiting for enrichment.
- [ ] Enrichment never silently changes displayed or editable recipe content.
- [ ] Planning, shopping, pantry and existing Get Ahead behaviour remain usable for pending, disabled, failed, invalid, timed-out and rate-limited enrichment.
- [ ] Failure and unavailable states are safe, understandable and recoverable without unnecessary user action.

### FR-2 — Deterministic-first enrichment

- [ ] Known ingredient aliases, quantities, units and actions resolve deterministically before any provider request.
- [ ] Meaningful ingredient and preparation distinctions are preserved.
- [ ] Unknown quantities/units remain unknown and incompatible dimensions are never converted or combined.
- [ ] Stable source references and original text survive every transformation.
- [ ] Provider calls are skipped when deterministic output is sufficient or AI is disabled.

### FR-3 — Strict provider boundary and validation

- [ ] Provider calls and credentials exist only in a trusted Supabase Edge Function/server boundary.
- [ ] Strict schema-constrained output accepts only supplied identifiers and allowed value shapes.
- [ ] Invented ingredients, quantities, steps, references and unsupported safety guidance are rejected.
- [ ] Raw provider errors, secrets and payloads never reach users or ordinary logs.
- [ ] Timeout, bounded retry, usage/concurrency limits, feature flag and kill switch are enforced server-side.

### FR-4 — Versioned and traceable results

- [ ] Enrichment is stored separately from the approved recipe and tied to the exact immutable recipe version/fingerprint.
- [ ] Every field has source reference, provenance, confidence and applicable schema/rules/model versions.
- [ ] A replacement does not supersede the previous valid result until validation and stale-version checks pass.
- [ ] Duplicate delivery/reprocessing is idempotent and cannot create duplicate active results.
- [ ] A material recipe edit queues a new version and invalidates affected downstream cached plans.
- [ ] CS-81 can consume validated active enrichment without re-enriching the recipe.

### FR-5 — Backfill and operations

- [ ] Existing recipes can be processed through an idempotent, resumable, rate-limited backfill.
- [ ] Backfill can pause, resume and safely retry without overwriting newer recipe versions.
- [ ] Operators can inspect aggregate success, rejection, fallback, latency, usage and estimated cost without accessing secrets or raw household/provider payloads.
- [ ] Failure categories distinguish disabled, timeout, rate/usage limit, transient provider, permanent provider, schema invalid, hallucination/unsupported data, stale version and internal validation failure.

### FR-6 — Security, privacy and household isolation

- [ ] Authority is derived at the trusted boundary; client-supplied household/user identity is not trusted.
- [ ] All browser-accessible reads are least-privilege and household/user scoped.
- [ ] Cross-household and unauthorised access is denied in repository, integration and pgTAP tests.
- [ ] Service-role processing proves source ownership before reading or activating results.
- [ ] Only synthetic fixtures are used; no real recipe, household or health data appears in tests or repository history.

### FR-7 — Evaluation and release gate

- [ ] Evaluate simple, complex, publisher-imported and user-authored synthetic recipes.
- [ ] Cover metric, imperial, count, range, approximate and unknown quantities; multi-component recipes; ambiguous wording; marinating, chilling, freezing, reheating and raw-protein handling.
- [ ] Record structured-output validity, field-level accuracy, unsupported-data rate, low-confidence rate, deterministic/model split, fallback rate, latency and estimated cost per recipe.
- [ ] Product review explicitly checks equivalent and meaningfully different ingredients/actions.
- [ ] Any invented or unsafe guidance is release-blocking.
- [ ] CS-81 remains blocked until the representative evaluation set is enriched and the contract is accepted.

## UX and Accessibility

CS-90 is primarily background infrastructure. Do not add user-visible AI theatre, blocking progress steps or approval clicks.

If a status is exposed in an existing recipe/admin surface:

- use plain Australian/UK English and describe impact, not provider internals;
- do not imply enrichment is required to use the saved recipe;
- provide semantic status text in addition to colour;
- preserve keyboard operation, visible focus, 44px touch targets and responsive layout;
- keep retries/reprocessing to protected operational controls unless a genuine user need is separately approved.

## Test Plan

### Domain and contract tests

- Alias normalisation with retained original text and meaningful modifiers.
- Equivalent ingredient identities versus relevant distinctions such as red onion/general onion.
- Diced, finely diced, roughly chopped, sliced, minced and grated actions remain distinguishable.
- Exact, range, approximate, count and unknown quantities; compatible conversion and incompatible dimensions.
- Ingredient-to-step links, ordered actions and multi-component boundaries.
- Explicit unknown and mixed/low confidence behaviour.
- Prepare-ahead/storage/batch/safety claims accepted only with supported evidence states.
- Provider-independent schema parser rejects extra keys, unknown IDs and invalid enums/references.

### Integration and failure tests

- Save/import/edit commits before async enrichment completes.
- AI disabled, timeout, rate limit, malformed output, hallucination, provider failure and retry exhaustion preserve recipe usability.
- Duplicate job delivery and simultaneous workers produce one valid active result.
- A recipe edited during processing prevents stale activation.
- Failed replacement preserves the previous valid active result.
- Downstream invalidation fires only after a new valid version activates.
- Provider adapter is mocked; automated tests do not spend API credits or require a real key.

### Database and security tests

- Migration reset/lint and generated-type freshness.
- Constraints, uniqueness, state transitions, claim/lease behaviour and expected indexes.
- RLS and pgTAP household/user isolation, unauthorised access and service-boundary assertions.
- Backfill pause/resume/idempotency and protection of newer versions.

### Evaluation evidence

- Version-controlled synthetic corpus and expected assertions without copyrighted recipe reproduction or real household data.
- Reproducible evaluation command/report including exact model/config/schema/rules versions.
- Separate deterministic-only and provider-assisted results.
- Cost calculation from recorded usage and configured pricing assumptions, with date/source recorded at implementation time.

## Quality Gates

- [ ] `npm ci` and `npm run preflight` complete in a supported environment.
- [ ] `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] `npm run db:validate`, generated-type freshness, RLS and pgTAP checks pass for database changes.
- [ ] Edge Function unit/contract tests and local/Preview integration evidence pass without exposing the key.
- [ ] `npm run docs:commands:check`, `npm run engineering:check-secrets` and `npm run security:audit-production` pass.
- [ ] Applicable Playwright, responsive and axe checks pass for any user-visible surface changed.
- [ ] Evaluation report and product review are attached or linked with real results and no unsafe/invented guidance.
- [ ] PR governance, Jira evidence, completion report and handover are complete.

## Definition of Done

- [ ] Every acceptance criterion is implemented and evidenced without excluded scope.
- [ ] Source preservation, version identity, idempotency, stale-worker protection and deterministic fallback are proven.
- [ ] Security, privacy, household isolation, secret handling and operational controls are satisfied.
- [ ] Documentation, migrations, generated types, tests and evaluation evidence match delivered behaviour.
- [ ] Required GitHub Actions pass and hosted/manual limitations are explicit.
- [ ] The accepted enrichment contract and representative backfill are ready for CS-81 consumption.
- [ ] Jira can progress through AIEOS using the package, PR, evaluation and release evidence.

## Implementation Sequencing

1. Confirm the current recipe persistence/version baseline and write the provider-neutral typed contract.
2. Add deterministic vocabulary, parsing and validation with contract fixtures.
3. Add additive version/result/job persistence, indexes, RLS, pgTAP and generated types.
4. Implement version-aware enqueueing after successful recipe import/create/material edit.
5. Implement the authenticated Edge Function worker and OpenAI adapter with strict structured output and runtime controls.
6. Add atomic activation, stale-result rejection, metrics and downstream invalidation.
7. Add protected resumable backfill and operational documentation.
8. Run the representative evaluation, resolve release-blocking findings and record cost/quality evidence.
9. Complete Preview/security/release validation and only then remove CS-81's implementation block.

## Release, Rollback and Cost

- **Expected migrations:** Yes — additive recipe version/enrichment/job/vocabulary support with RLS, pgTAP and generated-type updates. The package PR itself contains no migration and does not deploy Production.
- **Expected Edge Function:** Yes — trusted enrichment worker/provider adapter. The package PR itself contains no function and does not deploy Production.
- **Production database release:** Required after the implementation PR is accepted, through the protected workflow using the exact accepted `main` SHA.
- **Production Edge Function release:** Required after the implementation PR is accepted and database prerequisites are released, through the protected workflow.
- **Application release:** Only after human-approved merge and required backend releases/configuration.
- **Rollback:** Disable AI/enqueueing with the server kill switch, revert application/worker wiring, preserve immutable results and jobs, and use forward fixes for any released schema. Never edit an accepted migration.
- **New provider:** OpenAI API, already configured for Cooksmith; implementation still requires explicit model selection, pricing evidence, runtime budgets and Preview/Production secret availability checks.
- **Secret:** `OPENAI_API_KEY` in Supabase Edge Function secrets only; value never committed or exposed.
- **Dependencies:** Prefer platform APIs and existing dependencies. Any new package must be exact-versioned, justified, audited and separately declared.
- **Package-only PR cost:** A$0/month and A$0/year.
- **Implementation recurring cost:** Variable OpenAI usage; record estimated per-recipe, monthly and annual cost from the evaluation and obtain approval before broad enablement. Do not describe implementation cost as A$0.

## PR Requirements

Package PR title: `chore: add CS-90 engineering package — Recipe Intelligence foundation`

Implementation PR title: `CS-90: Shared Recipe Intelligence enrichment foundation`

Both PRs must link Jira and this package as applicable. The implementation PR must state the approved outcome, preserved behaviour, exact baseline, changed files, real validation/evaluation results, Preview/manual evidence, migrations, Edge Functions, production release order, rollback, provider/model/configuration, security/privacy review, and per-recipe/monthly/annual cost.
