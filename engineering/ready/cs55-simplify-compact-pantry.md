# Engineering Package — CS-55: Simplify and Compact Pantry Management

## Metadata

- **Milestone:** UX-P1
- **Jira issue:** CS-55
- **Epic:** Pantry (CS-3)
- **Status:** `Ready`
- **Branch:** `feat/cs-55-compact-pantry`
- **Depends on:** CS-14 and CS-48
- **Blocks:** None
- **Package path:** `engineering/ready/cs55-simplify-compact-pantry.md`

## Product Outcome

Turn Pantry into a compact screen with modal add, one-line discovery controls and smaller cards requiring minimal input.

## Current Baseline

- CS-14 provides Pantry CRUD, lifecycle, search/filter and RLS.
- Current add controls consume significant height.
- CS-48 owns automatic location/category assignment.

Verify these assumptions against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope

### Included

- Remove Your household staples and use shared heading scale.
- Open Add item in an accessible modal/sheet.
- Combine Search and Filter on one row.
- Compact recipe-style cards with Out of stock and Edit only; Delete lives in Edit.

### Explicitly Out of Scope

- CS-23 reconciliation
- CS-24 intelligence
- Duplicating CS-48 categorisation

## Functional Requirements and Acceptance Criteria

### FR-1 — Compact page shell

- [ ] Supporting staples line is removed.
- [ ] Heading matches other pages.
- [ ] Search/filter share one usable row at 320px.

### FR-2 — Minimal modal add

- [ ] Add opens a focus-managed overlay with item name primary.
- [ ] CS-48 assigns location/category with fallback.
- [ ] Success closes/restores focus; errors remain recoverable.

### FR-3 — Two card actions

- [ ] Cards show essential information only.
- [ ] × has accessible Mark [item] out of stock text.
- [ ] Edit supports corrections and confirmed Delete; no permanent third delete control.

## UX and Accessibility

- Design mobile first at 320 CSS pixels with no page overflow.
- Preserve 44px targets, keyboard operation, visible focus and screen-reader names.
- Define loading, empty, busy, success, failure and recovery states.
- Do not rely on colour, hover, position, gesture or an icon alone.
- Preserve zoom/reflow, text resizing and reduced-motion behaviour.
- Validate with component tests, Playwright responsive coverage, axe and manual keyboard checks.

## Data, Security and Privacy

- Keep domain rules typed and framework-independent.
- Derive authentication and active household authoritatively.
- Preserve RLS, least privilege and negative cross-household coverage.
- Reject forged household and record identifiers.
- Use deterministic/idempotent operations and set-based reads; avoid N+1 requests.
- Use synthetic fixtures only and keep logs/evidence free of private household content.
- Any database change must be additive, migration-safe and released through the protected post-merge workflow.

## Technical Direction

- Reuse Pantry lifecycle mutations and overlay primitives.
- Keep deletion deliberate and out-of-stock reversible.
- Reuse current application/domain/repository patterns.
- Do not add dependencies, providers or recurring cost without approval.
- Record an ADR for a new durable cross-domain contract.

## Implementation and Validation

1. Confirm dependencies are Done, merged and released as required.
2. Resolve product decisions, then move package to `engineering/ready/`, Jira to Ready and add `codex-ready`.
3. Branch from verified latest remote `main`.
4. Implement the smallest coherent change and preserve adjacent journeys.
5. Add unit, component, integration, database/RLS where applicable, E2E, accessibility and responsive tests.
6. Run `npm run preflight`, `npm ci`, format, docs command audit, lint, typecheck, tests and build.
7. Run database reset/lint/pgTAP/types if data changes.
8. Validate exact Vercel Preview journeys with synthetic households.
9. Record completion report, handover, migration/Edge declarations and Jira evidence.

## Hosted Preview Scenarios

- [ ] Add and edit item on 320px mobile.
- [ ] Mark out of stock, restore/edit and delete with confirmation.
- [ ] Verify search/filter and two-household isolation.

## Definition of Done

- [ ] All acceptance criteria and regressions pass.
- [ ] Household isolation and adjacent journeys remain intact.
- [ ] GitHub Actions and Vercel checks pass on exact PR head.
- [ ] Hosted mobile, desktop, keyboard and available assistive-technology evidence is recorded.
- [ ] Migration, Edge Function, Production, privacy, accessibility and cost impact are explicit.
- [ ] PR is reviewed/merged/released, Jira is Done and package is moved to `engineering/completed/`.

## Release, Rollback and Cost

- **Expected migration:** None expected; CS-48 owns any categorisation metadata change.
- **Expected Edge Function:** None.
- **Rollback:** Revert application/UI changes; use a forward fix for any released immutable migration.
- **Dependencies/providers:** No new dependency or provider expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements

PR title: `[CS-55] UX-P1 — Simplify and Compact Pantry Management`

Include Jira/package links, principles and effort removed, implementation, tests, Preview evidence, migration/Edge declarations, security/accessibility, limitations, rollback and cost.
