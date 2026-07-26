# Engineering Package — CS-81: AI-assisted weekly preparation plan consolidation

## Metadata

- **Milestone:** Get Ahead
- **Jira issue:** CS-81
- **Epic:** CS-64 — Get Ahead AI Preparation Assistant
- **Status:** `Ready`
- **Branch:** `feat/cs-81-weekly-preparation-plan-consolidation`
- **Depends on:** CS-65 plus approved shared recipe enrichment and canonical food schema
- **Blocks:** AI-assisted Get Ahead plan quality
- **Package path:** `engineering/ready/cs81-weekly-preparation-plan-consolidation.md`

## Product Outcome

Create a trustworthy weekly cross-recipe consolidation layer that reuses enriched recipe metadata, resolves deterministic cases without AI, uses a lightweight model only for ambiguous culinary decisions, and always falls back safely.

## Current Baseline

Get Ahead has deterministic preparation candidates, while raw wording differences such as chop/dice can prevent useful consolidation. Recipe cleaning and canonical food intelligence belong in a shared upstream enrichment capability, not inside this weekly planner.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Versioned deterministic candidate assembly from selected meals, servings and enriched recipe metadata.
- Compatibility checks across canonical ingredient, action, preparation, unit, timing, storage, safety and component boundaries.
- Strict server-side structured model call only for ambiguous/high-value decisions.
- Source validation, persistence/cache keyed by plan and recipe/enrichment versions, invalidation and deterministic fallback.
- Evaluation over at least 30 representative synthetic weekly plans with quality, latency and cost evidence.

### Explicitly Out of Scope

- Raw recipe cleaning/enrichment or canonical vocabulary creation.
- Pantry merge/delete operations, conversational planning or long-term learning.
- Direct model mutation of recipes, pantry records or meal plans.
- User-facing refresh controls or provider-specific client code.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-81 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Keep deterministic domain assembly/provider-independent validation separate from the Edge Function/provider adapter.
- [ ] The model may only select, group, order or reject supplied candidates; reject invented data and unknown-to-numeric conversions.
- [ ] Retain original text, source recipe/version, ingredient/step references, rule/schema/planner/enrichment versions and reason codes.
- [ ] Apply server-side timeouts, bounded retry, usage limits, feature configuration and privacy-safe metrics; document provider/cost approval before implementation.

### FR-3 — Quality and evidence

- [ ] Canonical equivalence, meaningful cut differences, incompatible units, unknown quantities and mixed-confidence metadata.
- [ ] Safety, allergen, cross-contamination, raw-protein, chilling, storage and component-boundary preservation.
- [ ] Hallucinated identifiers/quantities/instructions rejected with deterministic fallback.
- [ ] Cache reuse and invalidation across meal, serving, recipe and enrichment changes; reopening does not regenerate.
- [ ] Thirty-plan evaluation reports deterministic/model split, correctness, invalid output, fallback, latency and estimated cost.
- [ ] Record exact baseline and implementation commits, changed files, validation evidence, Preview status, migration/Edge declarations, security/privacy review and cost impact in the PR and handover.

## UX and Accessibility

- Apply Cooksmith Product Principles: quietly remove work, minimise human steps, use Australian/UK English and avoid dead or decorative controls that imply unavailable actions.
- Target WCAG 2.2 AA with semantic structure, visible focus, keyboard operation, 44px touch targets, colour-independent status, reduced-motion support and responsive layouts without horizontal overflow.
- Preserve entered data and user context through validation or recoverable failures.

## Data, Security and Privacy

- Derive household and role authority at trusted boundaries; client state is never an authorisation source.
- Keep all reads and writes household-scoped and least-privilege; add adversarial RLS coverage when persistence or access policy changes.
- Use only synthetic fixtures. Do not log or commit secrets, provider payloads, real household data or sensitive preference/recipe content.
- Any database change must be additive, migration-safe, generated-type current and released only after merge through the protected production workflow.

## Technical Direction

- Keep deterministic domain assembly/provider-independent validation separate from the Edge Function/provider adapter.
- The model may only select, group, order or reject supplied candidates; reject invented data and unknown-to-numeric conversions.
- Retain original text, source recipe/version, ingredient/step references, rule/schema/planner/enrichment versions and reason codes.
- Apply server-side timeouts, bounded retry, usage limits, feature configuration and privacy-safe metrics; document provider/cost approval before implementation.

## Test Plan

- Canonical equivalence, meaningful cut differences, incompatible units, unknown quantities and mixed-confidence metadata.
- Safety, allergen, cross-contamination, raw-protein, chilling, storage and component-boundary preservation.
- Hallucinated identifiers/quantities/instructions rejected with deterministic fallback.
- Cache reuse and invalidation across meal, serving, recipe and enrichment changes; reopening does not regenerate.
- Thirty-plan evaluation reports deterministic/model split, correctness, invalid output, fallback, latency and estimated cost.

## Quality Gates

- [ ] `npm run preflight` and `npm ci` complete.
- [ ] `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] Applicable docs, security, dependency, database/RLS, generated-type, Playwright, responsive and axe checks pass.
- [ ] Vercel Preview and any required hosted flow are tested and reported separately from local automation.
- [ ] PR governance, Jira evidence, completion report and handover are complete.

## Definition of Done

- [ ] Every acceptance criterion is implemented and evidenced without excluded scope.
- [ ] Security, privacy, household isolation and accessibility obligations are satisfied.
- [ ] Documentation and tests match the delivered behaviour.
- [ ] Required GitHub Actions pass and hosted/manual limitations are explicit.
- [ ] Jira can progress through AIEOS using the package, PR and release evidence.

## Release, Rollback and Cost

- **Expected migration:** Determine during implementation from the approved scope; if none is needed, declare none explicitly. Any migration is forward-only and does not deploy Production from the PR.
- **Expected Edge Function:** Determine during implementation; declare explicitly in the PR.
- **Rollback:** Revert application wiring where safe; use forward fixes for any released schema. Preserve existing household data.
- **New dependency/provider:** None unless explicitly identified, exact-versioned, reviewed and approved.
- **Recurring cost:** A$0/month and A$0/year unless a separate cost approval is completed before implementation.

## PR Requirements

PR title: `CS-81: AI-assisted weekly preparation plan consolidation`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
