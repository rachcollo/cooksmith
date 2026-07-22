# Engineering Package — CS-24: Explainable Pantry Intelligence

## Metadata
- **Milestone:** M11B
- **Jira issue:** CS-24
- **Epic:** Pantry (CS-3)
- **Status:** `Ready`
- **Branch:** `feat/cs-24-pantry-intelligence`
- **Depends on:** CS-23
- **Blocks:** CS-25
- **Package path:** `engineering/ready/cs24-explainable-pantry-intelligence.md`

## Product Outcome
Offer explainable low-stock, likely-needed and recently-out-of-stock prompts from confirmed Pantry state, with confirmation before Shopping changes.

## Current Baseline
- CS-23 must establish trustworthy reconciled stock.
- CS-22 provides Shopping state.
- CS-50 May already have guidance is separate.
Verify latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope
### Included
- Low stock from explicit threshold/reliable rule.
- Likely needed soon from upcoming meals and compatible stock.
- Recently out-of-stock candidates.
- Explain, dismiss/snooze and confirmed Add to shopping.
### Explicitly Out of Scope
- Automatic consumption
- Autonomous Shopping change
- Expiry guess
- AI/embeddings/queues
- Retail ordering

## Functional Requirements and Acceptance Criteria
### FR-1 — Typed explainable insight
- [ ] Every insight has reason and versioned deterministic rule.
- [ ] Unreliable data yields no guidance.
- [ ] Cross-household data cannot affect output.

### FR-2 — Low stock and upcoming need
- [ ] No threshold is guessed.
- [ ] Upcoming need respects compatible units and uncertainty.
- [ ] Already-listed item is not duplicated.

### FR-3 — User control
- [ ] Add to shopping requires confirmation.
- [ ] Dismiss/snooze has documented reset.
- [ ] No insight purchases, completes, removes or changes Pantry quantity.

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
- Start deterministic over CS-23-confirmed stock.
- Persist thresholds/dismissal only with additive household-scoped model.
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
- [ ] Show low-stock and upcoming-meal reason.
- [ ] Add once, dismiss/snooze and verify duplicate suppression.
- [ ] Test stale/uncertain/cross-household data.

## Definition of Done
- [ ] Acceptance criteria/regressions pass and household isolation remains intact.
- [ ] GitHub Actions/Vercel pass on exact head; hosted evidence recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** Possible additive threshold/dismissal state with RLS/pgTAP.
- **Expected Edge Function:** None expected.
- **Rollback:** Disable insights and forward-fix any released persistence.
- **New dependency/provider:** None expected unless explicitly approved.
- **Recurring cost:** A$0/month and A$0/year unless explicitly approved.

## PR Requirements
PR title: `[CS-24] M11B — Explainable Pantry Intelligence`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
