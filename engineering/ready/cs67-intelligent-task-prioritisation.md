# Engineering Package — CS-67: Intelligent Task Prioritisation

## Metadata

- **Milestone:** Get Ahead
- **Title:** Intelligent Task Prioritisation
- **Jira issue:** [CS-67](https://smillins.atlassian.net/browse/CS-67)
- **Epic:** Get Ahead
- **Status:** `Ready`
- **Branch:** `feat/cs-67-intelligent-task-prioritisation`
- **Depends on:** CS-65, CS-66
- **Blocks:** CS-69
- **Package path:** `engineering/ready/cs67-intelligent-task-prioritisation.md`

## Product Outcome

Make limited preparation time feel worthwhile by recommending the safe, supported tasks that deliver the greatest practical benefit later in the week. The result must be deterministic, explainable and easy for a user to override.

## Current Baseline

- CS-65 supplies source-linked preparation opportunities; CS-66 supplies duration selection, fitting, durable sessions and a deterministic fallback order.
- The repository keeps deterministic domain logic separate from providers and uses typed application/repository boundaries.
- There is no approved food-safety/freshness knowledge service, learning model, ranking telemetry or AI provider.
- Verify the accepted CS-65 estimate/source contract and CS-66 session snapshot schema before implementation.

## Approved Product Decisions

- Version 1 uses a deterministic weighted score, not an LLM or opaque model.
- Primary ranking benefit is estimated later time saved per preparation minute. Number of supported meals and complexity reduction may improve a score.
- Food safety and freshness are eligibility/constraint inputs only when explicitly supported by approved source data. Missing evidence must not be guessed or scored as safe.
- Ranking is recalculated when available time or task state changes, while completed-task history remains immutable.
- Users may include, exclude or reorder eligible tasks. Cooksmith briefly explains the main factors behind the overall recommendation, not a paragraph for every score.
- Stable tie-breaking is required so identical inputs never shuffle unexpectedly.

## Scope

### Included

- A versioned deterministic scoring model over eligible CS-65/CS-66 tasks.
- Duration-aware task selection and re-ranking.
- Estimated total downstream time saved for the recommendation.
- Brief recommendation rationale and per-task score evidence available for audit/debugging.
- User override controls and persistence within the current session.
- Automated tests for factor contribution, constraints, ties, fitting, overrides and regression.

### Explicitly Out of Scope

- LLM/provider calls, personalised learning, experimentation infrastructure or analytics-driven weights.
- Generating opportunities or inventing safety/freshness facts.
- Cross-recipe consolidation owned by CS-68.
- Checklist orchestration and defer/skip workflow owned by CS-69.
- Push notifications, schedules or automatic preparation.

## Functional Requirements

### FR-1 — Calculate a versioned priority score

**Acceptance criteria**

- [ ] Every eligible task receives a deterministic score, score version and factor breakdown.
- [ ] The documented model considers estimated time saved, task duration, number of meals supported and cooking-complexity reduction.
- [ ] Explicit safety/freshness constraints can exclude or lower a task only through approved, source-linked data.
- [ ] Missing or ambiguous safety/freshness information never creates a positive claim or invented recommendation.
- [ ] Scores are normalised to a documented range and stable tie-breakers use source/task identifiers.

### FR-2 — Rank for the selected time

**Acceptance criteria**

- [ ] The recommendation maximises documented benefit while its total preparation duration stays within the selected time.
- [ ] Re-ranking occurs when available time, eligible task state or an override changes.
- [ ] Completed tasks remain in session history and are not returned to the remaining recommendation.
- [ ] Identical inputs produce identical order, selection, totals and explanation.
- [ ] Empty or zero-fit results return a useful state and do not suggest unsafe partial work.

### FR-3 — Explain the recommendation

**Acceptance criteria**

- [ ] The session shows estimated total time saved using the same rounding and labelling contract as CS-66.
- [ ] A brief overall explanation names no more than the most important two or three ranking factors.
- [ ] The explanation is generated from structured factor evidence, not free-form AI text.
- [ ] Users can inspect the source meals supported by a task without being shown raw internal scores by default.

### FR-4 — Allow user overrides

**Acceptance criteria**

- [ ] A user can exclude a recommended task, include an eligible unselected task and reorder selected tasks.
- [ ] Overrides are keyboard and touch operable, persist with the session and survive refresh.
- [ ] Including a task that would exceed available time prompts a clear choice to replace lower-value work or increase available time; Cooksmith does not silently exceed the limit.
- [ ] Reverting overrides restores the deterministic recommendation for the current inputs.
- [ ] An override never bypasses an explicit eligibility, authorisation or safety constraint.

### FR-5 — Preserve auditability

**Acceptance criteria**

- [ ] The session snapshot records score version, factor inputs, selected result and user overrides.
- [ ] A future score-version change does not silently rewrite an in-progress or completed historical session.
- [ ] Re-ranking within a session records the current version and preserves completed-task evidence.

## UX and Interaction Requirements

- Show the benefit first: available time, estimated later time saved and a short “Why these tasks?” explanation.
- Keep overrides progressive: a simple edit action reveals eligible alternatives and ordering controls.
- Provide a non-drag keyboard/touch alternative for reordering and announce order changes.
- Define recalculating, no-fit, invalid-estimate, override-conflict and recoverable-save states.
- Avoid false precision; display rounded human-friendly estimates.

## Data and Domain Requirements

- Define typed score inputs, factor weights, eligibility constraints, score breakdown, stable tie-break and score-version contracts.
- Keep the scorer pure and framework-independent. Persist only the evidence needed to reproduce or audit the selected recommendation.
- Extend CS-66 session/task storage additively if necessary; do not overwrite historical snapshots.
- Preserve household scope and the source opportunity/recipe/planned-meal references established by CS-65/CS-66.

## Technical Direction

- Implement and test the score/selection engine as pure domain functions.
- Prefer a documented, bounded optimisation method appropriate to the small task set; guard against exponential work for unusually large plans.
- Keep weights in versioned code, not remotely mutable configuration, until a separate product decision approves tuning infrastructure.
- Reuse CS-66 authorisation, session persistence and UI boundaries.
- Add no dependency, provider, Edge Function or background job.

## Security and Privacy

- Ranking must run only over the authorised session’s household-scoped tasks.
- Override requests validate session/task ownership and legal transitions authoritatively.
- Do not log recipe text, household task details or factor inputs to third-party services.
- Preserve CS-66 RLS denial coverage after any schema extension.

## Accessibility

- Explanations and estimates are available to screen readers and do not rely on colour.
- Override controls have clear names, visible focus and predictable focus restoration.
- Reordering has buttons or another non-pointer mechanism with live confirmation.
- Recalculation does not unexpectedly move focus or erase user input.

## Test Plan

### Unit and component

- Each factor independently, factor boundaries, missing evidence, exclusions, normalisation and score-version output.
- Stable ties, duration fitting, no-fit, large task sets, completed-task removal and deterministic reranking.
- Include/exclude/reorder/revert overrides, time conflicts, explanation selection and accessible ordering controls.

### Integration, database and RLS

- CS-65 opportunities become scored CS-66 session tasks with reproducible evidence.
- Overrides and re-ranked order survive refresh without rewriting completed history.
- Owner/member access and inactive, unrelated, unauthenticated and forged-identifier denial.
- Migration reset, database lint, pgTAP and generated-type freshness if persistence changes.

### End-to-end and hosted preview

- Compare 15-minute and 2-hour recommendations, inspect the explanation and verify totals.
- Exclude/include/reorder tasks, resolve an over-time conflict, refresh and confirm overrides remain.
- Complete work, change remaining time and confirm completed work stays fixed while remaining work re-ranks.
- Validate mobile, desktop, keyboard, axe and text-zoom behaviour on the exact Preview.

## Quality Gates

- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Applicable Playwright, responsive and axe suites pass.
- [ ] Database/RLS/generated-type checks pass if persistence changes.
- [ ] Package readiness validation passes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Hosted Preview evidence is recorded honestly.

## Definition of Done

- [ ] Scoring, selection, explanations and overrides meet all acceptance criteria.
- [ ] The model is deterministic, versioned, bounded and reproducible.
- [ ] No unsupported food-safety or freshness inference is introduced.
- [ ] Automated, Preview, Jira, migration and handover evidence is complete.

## Release, Rollback and Cost

- **Expected migration impact:** Possibly additive score-evidence and override fields on the CS-66 session model; no standalone store is preferred.
- **Expected Edge Function impact:** None.
- **Production deployment:** If a migration is required, use the protected Production database workflow after merge.
- **Rollback:** Restore CS-66 deterministic fallback ordering and hide override/explanation controls while preserving historical score evidence.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `CS-67: Intelligent task prioritisation`

Include Jira/package links, dependency verification, score formula/version, factor and constraint decisions, fitting complexity, override evidence, migration and Edge Function declarations, RLS evidence, automated checks, Preview URL, accessibility evidence, rollback and A$0 cost impact.
