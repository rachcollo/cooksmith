# Engineering Package — CS-68: Task Consolidation

## Metadata

- **Milestone:** Get Ahead
- **Title:** Task Consolidation
- **Jira issue:** [CS-68](https://smillins.atlassian.net/browse/CS-68)
- **Epic:** Get Ahead
- **Status:** `Ready`
- **Branch:** `feat/cs-68-task-consolidation`
- **Depends on:** CS-65, CS-66
- **Blocks:** None
- **Package path:** `engineering/ready/cs68-task-consolidation.md`

## Product Outcome

Remove repeated preparation work across the week. When planned recipes require genuinely equivalent and compatible preparation, Cooksmith presents one clear task with the total quantity and every meal it supports.

## Current Baseline

- CS-65 identifies source-linked candidate opportunities; CS-66 turns eligible opportunities into durable session tasks.
- Recipe ingredients have optional quantities, units and preparation text, but the current model is not a complete culinary ontology or food-safety authority.
- Shopping has deterministic unit handling patterns that may inform, but must not be coupled to, preparation quantities.
- There is no approved cross-recipe equivalence catalogue, consolidation key or multi-source completion contract on `main`.

## Approved Product Decisions

- Consolidation is conservative and deterministic. Tasks combine only when operation, ingredient identity, preparation specification, safety/storage requirements and compatible unit handling all agree.
- Normalised names alone are insufficient evidence for consolidation.
- Known compatible metric units may be converted through a small approved conversion table. Count units may sum only when they refer to the same item/specification. Free-text, missing or incompatible units remain separate.
- Combined wording uses the converted total only when exact. Cooksmith never invents a quantity.
- Completing a consolidated task completes each linked session task atomically. Reopening it reopens the linked tasks unless later individual state makes that unsafe or ambiguous.
- Users can expand a combined task to see all supported meals and source quantities.

## Scope

### Included

- Deterministic equivalence and compatibility rules for supported CS-65 opportunity types.
- Grouping compatible opportunities across planned recipes into one CS-66 session task.
- Exact quantity conversion/summing for an approved unit subset.
- Multi-source task presentation with every supported meal and recipe-specific notes.
- Atomic complete/reopen propagation to linked task records.
- Conservative fallback to separate tasks and automated coverage for ambiguous cases.

### Explicitly Out of Scope

- Fuzzy/semantic/LLM matching, external ingredient taxonomies or general unit-conversion libraries.
- Combining tasks with different operations, cuts, cooking states, allergens, storage instructions or unverified safety requirements.
- Shopping-list quantity mutation, pantry consumption or recipe rewriting.
- Prioritisation weights owned by CS-67 and polished checklist orchestration owned by CS-69.

## Functional Requirements

### FR-1 — Detect equivalent preparation tasks

**Acceptance criteria**

- [ ] Each candidate receives a versioned consolidation signature derived from approved structured source fields.
- [ ] Candidates combine only when operation, ingredient identity, preparation specification and explicit handling/storage constraints are compatible.
- [ ] The same input set produces the same groups and stable group identifiers regardless of input order.
- [ ] Ambiguous, missing, unsupported or contradictory source data keeps tasks separate.
- [ ] Consolidation never crosses households, selected plans or unrelated session snapshots.

### FR-2 — Calculate total quantity safely

**Acceptance criteria**

- [ ] Exact matching units sum deterministically.
- [ ] Approved compatible units convert to a documented display unit without losing material precision.
- [ ] Count quantities sum only for equivalent item/specification and preserve fractional counts only when already supported by source data.
- [ ] Missing, free-text, approximate, incompatible or unrecognised quantities are not guessed, converted or presented as one total.
- [ ] The combined display retains each original source quantity for inspection.

### FR-3 — Present one useful action

**Acceptance criteria**

- [ ] A compatible group is shown as one actionable task, for example “Chop 6 onions”.
- [ ] The combined task shows every supported planned meal and can reveal recipe-specific source notes.
- [ ] If an exact total cannot be produced, compatible work may share an action heading only when each source quantity remains clear; otherwise tasks stay separate.
- [ ] Accessible expanded/collapsed state and source-meal count are announced without relying on colour.

### FR-4 — Propagate completion atomically

**Acceptance criteria**

- [ ] Completing a combined task marks every linked session task complete in one authorised transaction.
- [ ] Retrying the action is idempotent and cannot partially apply.
- [ ] Reopening a combined task reopens the linked tasks consistently and recalculates the remaining CS-66/CS-67 session recommendation.
- [ ] A stale, removed or unauthorised source blocks the state change with a recoverable message instead of partial completion.
- [ ] Historical source links and quantities remain auditable after completion.

### FR-5 — Preserve recipe-specific requirements

**Acceptance criteria**

- [ ] Recipe-specific handling, storage, allergen and timing notes remain attached to their source meal.
- [ ] Conflicting notes prevent consolidation unless an explicit approved rule proves compatibility.
- [ ] Combined task text never replaces or weakens source recipe instructions.

## UX and Interaction Requirements

- Default to the concise combined action, quantity, duration/time-saved estimate and supported-meal count.
- Use progressive disclosure for the meal list, original quantities and recipe-specific notes.
- Provide clear separate-task fallback without warning noise; conservative non-consolidation is normal.
- Define loading, no-duplicates, stale-source, partial-network-failure and successful atomic-update states.
- Keep expand and complete controls distinct, keyboard operable and at least 44 CSS pixels on touch layouts.

## Data and Domain Requirements

- Define typed consolidation signatures, compatibility results with reason codes, source allocations and versioned conversion rules.
- Model a consolidated task as a session presentation/task entity linked to two or more immutable source task snapshots; do not duplicate or lose source lineage.
- Use decimal-safe quantity handling consistent with existing recipe data. Document precision and display rounding.
- Additive persistence must remain household-scoped and protected by RLS. Enforce atomic propagation at the database/application boundary.

## Technical Direction

- Implement equivalence, conversion and grouping as pure typed domain functions.
- Start with an explicit allow-list of supported operations and conversions; do not introduce fuzzy matching.
- Reuse CS-66 session persistence and CS-67 recalculation hooks without coupling to Shopping reconciliation.
- Prefer a constraint-backed transaction/RPC for atomic multi-task state changes if the existing repository boundary cannot guarantee them.
- Add no provider, dependency, Edge Function or background process.

## Security and Privacy

- Resolve all source task identifiers through the authorised household/session.
- Prevent forged source lists from completing tasks in another household or a different session.
- Return generic failure information for inaccessible sources without leaking recipe or meal details.
- Preserve CS-66 RLS checks for owner/member, inactive, unrelated and unauthenticated access.

## Accessibility

- Combined state, supported-meal count and completion state are programmatically named.
- Disclosure controls use correct expanded state and predictable focus.
- Completion/reopen feedback is announced once; atomic failure leaves focus and state stable.
- Source details remain readable at text zoom and 320 CSS pixels.

## Test Plan

### Unit and component

- Stable signatures/groups across input order, exact matches, approved conversions and count quantities.
- Different operations/cuts/states, missing/free-text units, approximate quantities and conflicting notes remain separate.
- Display wording, source meal disclosure, rounding, expansion and accessible names.

### Integration, database and RLS

- Multi-recipe opportunities create one group with complete lineage.
- Complete/retry/reopen are atomic and trigger remaining-session recalculation.
- Stale-source and simulated transaction failure produce no partial state.
- Owner/member success and inactive, unrelated, unauthenticated and forged-source denial.
- Migration reset, database lint, pgTAP and generated-type freshness if persistence changes.

### End-to-end and hosted preview

- Plan multiple recipes with compatible onion preparation, verify one exact combined task and all supported meals.
- Exercise incompatible units, different cuts and conflicting handling notes and confirm separate tasks.
- Complete, refresh and reopen a combined task and confirm every linked task remains consistent.
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

- [ ] Only provably compatible tasks consolidate and every source remains visible/auditable.
- [ ] Quantity totals are exact within the approved conversion set; ambiguous inputs are never guessed.
- [ ] Completion/reopen propagation is authorised, atomic and idempotent.
- [ ] Automated, Preview, Jira, migration and handover evidence is complete.

## Release, Rollback and Cost

- **Expected migration impact:** Possibly additive consolidation/source-link persistence or an atomic state-change function extending CS-66; confirm against the accepted session model.
- **Expected Edge Function impact:** None.
- **Production deployment:** If database changes are required, use the protected Production database workflow after merge.
- **Rollback:** Stop generating consolidated presentation tasks and render original CS-66 tasks separately; preserve source links and forward-fix released schema.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `CS-68: Task consolidation`

Include Jira/package links, dependency verification, equivalence signature and conversion catalogue, conservative fallback examples, atomic propagation/RLS evidence, migration and Edge Function declarations, automated checks, Preview URL, accessibility evidence, rollback and A$0 cost impact.
