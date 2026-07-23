# Engineering Package — CS-65: Preparation Opportunity Detection

## Metadata

- **Milestone:** Get Ahead
- **Jira issue:** CS-65
- **Epic:** Get Ahead
- **Status:** `Ready`
- **Branch:** `feat/cs-65-preparation-opportunity-detection`
- **Depends on:** Recipes and Meal Planner (verify the linked foundation issues are Done before build)
- **Blocks:** CS-66, CS-67, CS-68, CS-75, CS-76
- **Package path:** `engineering/ready/cs65-preparation-opportunity-detection.md`

## Product Outcome

Give a household a deterministic, reviewable preparation-opportunity dataset from the recipes in its current meal plan, so later Get Ahead work can prioritise and present useful preparation without making the user find possibilities unaided.

## Current Baseline

- Recipes have household-scoped structured ingredient rows, including optional preparation text, and ordered free-text steps.
- Plan has linked recipes and existing Shopping generation; neither is a preparation engine or a cooking-safety authority.
- Confirm the latest `main`, linked Recipe and Meal Planner foundations, RLS conventions, migrations and current Planner tests before implementation.

## Scope

### Included

- Analyse every linked, planned recipe in the selected household plan.
- Return typed, explainable candidate opportunities for chopping, marinating, sauce preparation and fully cooking components when supported by approved recipe information.
- Return candidate signals for duplicate preparation, leftovers and freezer opportunities for the downstream consolidation and session stories.
- Preserve recipe, planned-meal and source-step/ingredient references so prioritisation and Guided Cooking can explain each candidate.

### Explicitly Out of Scope

- A user-facing preparation session, task completion or automatic recipe/shopping/pantry mutation.
- Cross-recipe consolidation, ranking, scheduling, learning, AI/LLM inference or external food knowledge services.
- Guessing food safety, storage duration, allergen handling, recipe intent or a preparation method from an ingredient name alone.

## Functional Requirements and Acceptance Criteria

### FR-1 — Household-scoped deterministic analysis

- [ ] Analyse all and only linked planned recipes for the authorised household and selected plan.
- [ ] Produce no opportunity for an unlinked meal or insufficient source information.
- [ ] Output is deterministic for the same plan and recipe revisions, with a versioned rule identifier and source references.

### FR-2 — Supported preparation candidates

- [ ] A supported ingredient or recipe instruction can yield a candidate classified as chop, marinate, sauce or cook-component.
- [ ] Each candidate identifies its recipe, planned meal, source ingredient/step and a human-readable reason.
- [ ] Candidates do not claim a safety, storage or freezer recommendation unless the approved source data explicitly supports it.

### FR-3 — Downstream-ready information

- [ ] Candidate data contains stable identifiers, type, source references, recipe revision context and rule version sufficient for later prioritisation and consolidation.
- [ ] Duplicate, leftover and freezer signals remain candidates; CS-68/CS-76 own their final semantics and user experience.
- [ ] Empty plans and recipes without qualifying data return an empty result, not an error.

## UX and Accessibility

- CS-65 is a domain/data contract; it introduces no standalone user interface.
- Downstream UI must show reasons and source meals, remain keyboard operable and never present a candidate as an automatic action.

## Data, Security and Privacy

- Keep rules framework-independent and derive the household from authorised server-side context.
- Reuse existing household-scoped reads and RLS; add a migration only if durable candidate storage is required by an approved decision.
- Do not expose recipe or household data across households; cover unauthenticated, unrelated and inactive-member access where persistence is introduced.

## Technical Direction

- Start with a pure typed domain analyser over existing planner and recipe models, then expose it through the current application/repository boundary.
- Treat the analyser as read-only and version rules explicitly; do not add a provider, background job, Edge Function or dependency.
- Add only additive, migration-safe persistence if the approved lifecycle needs it; otherwise calculate on demand.

## Test Plan

- Unit: classification, deterministic identifiers, source traceability, missing/ambiguous data and empty-plan behaviour.
- Integration: authorised household data only, all linked recipes included, unlinked meals excluded and cross-household denial if an application/database boundary is added.
- End-to-end: defer to CS-66 because this package has no user-facing flow; exercise its output through the first approved preparation-session UI.

## Quality Gates

- [ ] `npm run preflight`, `npm ci`, format/check, lint, typecheck, test and build pass.
- [ ] Run database/RLS, generated-type and migration checks if persistence changes.
- [ ] Run secret scan and `npm run docs:commands:check`.
- [ ] Record a Vercel Preview limitation: no standalone UI is introduced; validate the first consumer flow in CS-66.

## Deferred Work / Open Questions

- What approved, explainable rule catalogue and recipe annotations establish that an ingredient may be chopped, a protein marinated, a sauce prepared or a component cooked ahead? The current recipe model has optional preparation text and free-text steps, but no cooking-safety or storage taxonomy. Do not infer these facts from names alone.
- What exact semantics distinguish a leftover opportunity from a freezer opportunity, including required storage evidence and household confirmation? CS-76 should own that user-facing contract.
- Should candidates be calculated on demand or persisted with a lifecycle/versioning policy? Decide only when a consumer requires durable state.

## Definition of Done

- [ ] Acceptance criteria and regressions pass without automatic household-data mutation.
- [ ] Output is explainable, deterministic and household-isolated.
- [ ] Any persistence has additive migration, RLS and release evidence; otherwise no schema change is introduced.
- [ ] PR, Jira evidence, Preview limitation, handover and production-release declarations are complete.

## Release, Rollback and Cost

- **Expected migration:** None unless a later approved persistence decision requires an additive household-scoped model.
- **Expected Edge Function:** None.
- **Rollback:** Remove the read-only analyser from its caller; forward-fix any released persistence.
- **New dependency/provider:** None.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements

PR title: `CS-65: Preparation opportunity detection`

Include the Jira/package links, approved rule catalogue decision, source-traceability examples, household/RLS evidence, tests, Preview limitation, migration and Edge Function declarations, rollback and A$0 cost impact.
