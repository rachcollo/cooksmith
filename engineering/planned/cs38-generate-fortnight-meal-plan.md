# Engineering Package — CS-38: Generate a Fortnight Meal Plan from Household Constraints

## Metadata
- **Milestone:** M08E
- **Jira issue:** CS-38
- **Epic:** Meal Planning (CS-4)
- **Status:** Planned
- **Branch:** `feat/cs-38-fortnight-plan-generation`
- **Depends on:** CS-20, CS-22 and approved household preference/safety data
- **Blocks:** CS-25
- **Package path:** `engineering/planned/cs38-generate-fortnight-meal-plan.md`

## Product Outcome
Propose a practical fortnight of permitted recipes from household constraints, then let the household review and adjust before Apply.

## Current Baseline
- Planner supports linked recipes/household-local dates.
- CS-22 reconciles Shopping after planner mutations.
- Authoritative safety/preference data and priority order require readiness review.
Verify latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope
### Included
- Short default-led constraints: dates, empty nights, time, favourites/exclusions and variety.
- Deterministic constraint solver/ranker fallback.
- Review/replace/move/remove/regenerate before Apply.
- Explain unmet non-safety constraints and preserve existing meals by default.
### Explicitly Out of Scope
- Autonomous planner writes
- Medical advice/inferred allergies
- Retail ordering
- Automatic Pantry consumption
- Paid AI without approval

## Functional Requirements and Acceptance Criteria
### FR-1 — Safe proposal
- [ ] Safety is hard constraint and never relaxed.
- [ ] Every recipe is visible/permitted.
- [ ] Relaxed non-safety constraints are explained.

### FR-2 — Review before apply
- [ ] Working Planner remains unchanged until confirmation.
- [ ] Individual proposals can be replaced/moved/removed.
- [ ] Existing meals are preserved unless replacement explicitly confirmed.

### FR-3 — Reliable apply
- [ ] Apply is atomic or has explicit recovery.
- [ ] CS-22 reconciliation runs without duplicates.
- [ ] Deterministic fallback completes journey without AI.

## UX and Accessibility
- Design mobile first at 320px with calm default-led flows.
- Define loading, empty, busy, success, failure and recovery.
- Preserve 44px targets, keyboard/focus, contextual names, zoom/reflow and reduced motion.
- Do not rely on colour, hover, gesture or icon alone.
- Validate through component tests, responsive Playwright, axe and manual keyboard/available screen-reader checks.

## Data, Security and Privacy
- Keep domain rules typed, deterministic and framework-independent.
- Derive authentication/active household authoritatively; reject forged identifiers.
- Preserve RLS/least privilege and owner/member/inactive/unrelated/unauthenticated coverage.
- Use idempotent operations and set-based reads; avoid N+1.
- Use synthetic fixtures; exclude household content, identities, tokens and credentials from logs/evidence.
- Data changes are additive/migration-safe and use protected post-merge Production release.

## Technical Direction
- Implement deterministic solver/ranker first with frozen-input tests.
- AI may rank/explain later only after privacy, cost and fallback approval; deterministic boundary enforces safety.
- Reuse current application/domain/repository patterns.
- No dependency/provider/cost without approval.
- Record ADR for new durable cross-domain contract.

## Implementation and Validation
1. Confirm dependencies Done/merged/released and settle product decisions.
2. Move package to `engineering/ready/`, Jira to Ready and add `codex-ready`.
3. Branch from latest verified remote `main`.
4. Write invariants/decision tables before data changes.
5. Implement smallest coherent change; preserve adjacent journeys.
6. Add unit, component, integration, database/RLS where applicable, E2E, accessibility and responsive tests.
7. Run preflight, npm ci, format, docs audit, lint, typecheck, test, build and applicable database gates.
8. Validate exact Vercel Preview with synthetic households.
9. Record completion report, handover, release declarations and Jira evidence.

## Hosted Preview Scenarios
- [ ] Generate fortnight with empty/quick/favourite constraints.
- [ ] Prove safety exclusion and explain a relaxed preference.
- [ ] Edit proposal, Apply once and verify Planner/Shopping with retry.

## Definition of Done
- [ ] Acceptance criteria/regressions pass and household isolation remains intact.
- [ ] GitHub Actions/Vercel pass on exact head; hosted evidence recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** None expected; preference/safety gaps may require separately approved additive model.
- **Expected Edge Function:** None for deterministic first release; any AI service requires separate approval.
- **Rollback:** Disable generation entry; confirmed plans remain ordinary planned meals.
- **New dependency/provider:** None expected unless explicitly approved.
- **Recurring cost:** A$0/month and A$0/year unless explicitly approved.

## PR Requirements
PR title: `[CS-38] M08E — Generate a Fortnight Meal Plan from Household Constraints`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
