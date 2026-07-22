# Engineering Package — CS-23: Pantry Consumption and Reconciliation

## Metadata

- **Milestone:** M11A
- **Jira issue:** CS-23
- **Epic:** Pantry (CS-3)
- **Status:** `Ready`
- **Branch:** `feat/cs-23-pantry-reconciliation`
- **Depends on:** CS-14, CS-22 and CS-48
- **Blocks:** CS-24
- **Package path:** `engineering/ready/cs23-pantry-consumption-reconciliation.md`

## Product Outcome

Users explicitly review groceries being put away and ingredients used after cooking so Pantry becomes accurate without invisible assumptions.

## Current Baseline

- CS-14 owns pantry lifecycle/quantity.
- CS-22 owns generated shopping provenance.
- No durable reconciliation event model is assumed.
  Verify against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope

### Included

- Put-away review for completed shopping.
- Meal-cooked review for compatible recipe deductions.
- Partial quantity, correction and skip.
- Durable source provenance, idempotency and transactionality.

### Explicitly Out of Scope

- Automatic background consumption
- Predictive guidance
- AI/unit guessing
- Receipt/barcode ingestion

## Functional Requirements and Acceptance Criteria

### FR-1 — Put away shopping

- [ ] Completion never mutates Pantry automatically.
- [ ] Strong match proposes increment; unmatched proposes CS-48-classified new item.
- [ ] User can accept, edit, skip or cancel.

### FR-2 — Meal cooked review

- [ ] Only compatible matches propose deductions.
- [ ] Ambiguous names/units/quantities are not guessed.
- [ ] Free-text meals create no deduction.

### FR-3 — Safe reconciliation

- [ ] Retry cannot double-add/deduct.
- [ ] Quantity stays valid and unrelated contributions remain.
- [ ] Each event/correction is household-scoped and traceable.

## UX and Accessibility

- Design mobile first at 320 CSS pixels with no overflow.
- Define loading, empty, busy, success, failure and recovery.
- Preserve 44px targets, keyboard operation, visible focus, contextual names, zoom/reflow and reduced motion.
- Do not rely on colour, hover, position, gesture or icon alone.
- Validate with component tests, Playwright, axe and manual keyboard/available screen-reader checks.

## Data, Security and Privacy

- Keep domain rules typed, deterministic and framework-independent.
- Derive authentication/active household authoritatively; reject forged identifiers.
- Preserve RLS, least privilege and owner/member/inactive/unrelated/unauthenticated coverage.
- Use idempotent operations and set-based reads; avoid N+1.
- Use synthetic fixtures and exclude household content, identities, tokens and credentials from logs/evidence.
- Database changes are additive, migration-safe and use protected post-merge Production release.

## Technical Direction

- Introduce additive reconciliation event/line provenance and transactional RPC/application boundary.
- Preserve original source text and exact units; no unlike-unit conversion.
- Reuse current application/domain/repository patterns.
- Do not add dependencies/providers/cost without approval.
- Record an ADR for a new durable cross-domain contract.

## Implementation and Validation

1. Confirm dependencies are Done/merged/released.
2. Resolve product decisions; move package to `engineering/ready/`, Jira to Ready and add `codex-ready`.
3. Branch from verified latest remote `main`.
4. Write invariants/decision tables before data changes.
5. Implement smallest coherent change and preserve adjacent journeys.
6. Add unit, component, integration, database/RLS where applicable, E2E, accessibility and responsive tests.
7. Run preflight, npm ci, format, docs command audit, lint, typecheck, test and build; add database gates when applicable.
8. Validate Vercel Preview with synthetic households.
9. Record completion report, handover, release declarations and Jira evidence.

## Hosted Preview Scenarios

- [ ] Put away completed manual/generated items.
- [ ] Cook linked meal, edit/skip deductions and retry once.
- [ ] Prove unrelated household and duplicate retry denial.

## Definition of Done

- [ ] Acceptance criteria and regressions pass.
- [ ] Household isolation and adjacent journeys remain intact.
- [ ] GitHub Actions/Vercel pass on exact PR head and hosted evidence is recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact are explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost

- **Expected migration:** Expected additive reconciliation/provenance migration with RLS/pgTAP and protected release.
- **Expected Edge Function:** None unless explicitly approved.
- **Rollback:** Revert UI/application; use forward fix for released immutable migration.
- **New dependency/provider:** None expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements

PR title: `[CS-23] M11A — Pantry Consumption and Reconciliation`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
