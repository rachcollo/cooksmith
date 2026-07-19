# Engineering Package — CS-54: Compact the Shopping Page and Item Entry

## Metadata

- **Milestone:** UX-S1
- **Jira issue:** CS-54
- **Epic:** Shopping Lists (CS-6)
- **Status:** Planned
- **Branch:** `feat/cs-54-compact-shopping-page`
- **Depends on:** CS-21 and CS-22
- **Blocks:** None
- **Package path:** `engineering/planned/cs54-compact-shopping-page.md`

## Product Outcome

Show more shopping items before scrolling, keep manual entry to one line and place the outstanding count beside the heading.

## Current Baseline

- Shopping supports manual and CS-22-generated items.
- Item and optional quantity are the intended quick-add fields.
- Complete, restore, edit and remove must remain intact.

Verify these assumptions against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope

### Included

- Shared heading scale and right-aligned count.
- One-row item, optional quantity and Add.
- Denser list rows with accessible actions.

### Explicitly Out of Scope

- CS-22 aggregation changes
- Pantry matching logic
- Retailer export
- New shopping fields

## Functional Requirements and Acceptance Criteria

### FR-1 — Heading and live count

- [ ] Shopping uses the shared heading scale.
- [ ] # left to buy is right-aligned on the heading row.
- [ ] Count updates and has meaningful screen-reader text.

### FR-2 — One-line quick add

- [ ] Item, optional quantity and Add fit one row.
- [ ] Keyboard submit and Add share validation/mutation.
- [ ] 320px layouts do not overflow.

### FR-3 — Dense usable rows

- [ ] More rows appear before scrolling.
- [ ] Names, quantities, sources and completion remain legible.
- [ ] Controls remain 44px and long names wrap safely.

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

- Reuse current shopping mutations and cache invalidation.
- Visual density must not reduce semantic/action target size.
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

- [ ] Add manual item on mobile and desktop.
- [ ] Verify count after add/complete/restore/remove.
- [ ] Check long/generated/completed rows and keyboard flow.

## Definition of Done

- [ ] All acceptance criteria and regressions pass.
- [ ] Household isolation and adjacent journeys remain intact.
- [ ] GitHub Actions and Vercel checks pass on exact PR head.
- [ ] Hosted mobile, desktop, keyboard and available assistive-technology evidence is recorded.
- [ ] Migration, Edge Function, Production, privacy, accessibility and cost impact are explicit.
- [ ] PR is reviewed/merged/released, Jira is Done and package is moved to `engineering/completed/`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application/UI changes; use a forward fix for any released immutable migration.
- **Dependencies/providers:** No new dependency or provider expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements

PR title: `[CS-54] UX-S1 — Compact the Shopping Page and Item Entry`

Include Jira/package links, principles and effort removed, implementation, tests, Preview evidence, migration/Edge declarations, security/accessibility, limitations, rollback and cost.
