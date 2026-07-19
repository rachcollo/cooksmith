# Engineering Package — CS-53: Compact the Recipe Library Action Toolbar

## Metadata

- **Milestone:** UX-R1
- **Jira issue:** CS-53
- **Epic:** Recipe Library (CS-5)
- **Status:** Planned
- **Branch:** `feat/cs-53-compact-recipe-toolbar`
- **Depends on:** CS-20 and CS-30
- **Blocks:** None
- **Package path:** `engineering/planned/cs53-compact-recipe-library-toolbar.md`

## Product Outcome

Search, Add and Import share one calm compact row so users reach recipes and creation actions with less scrolling.

## Current Baseline

- Recipe tiles are compact and open details from the tile surface.
- Search, manual Add and URL Import already work.
- Recipe Library heading defines the shared heading scale.

Verify these assumptions against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope

### Included

- Place Search, Add and Import on one responsive row.
- Shorten Search as the flexible control.
- Preserve the compact recipe grid and all actions.

### Explicitly Out of Scope

- Search ranking changes
- Recipe-card redesign
- Persistence/import contract changes

## Functional Requirements and Acceptance Criteria

### FR-1 — One responsive toolbar

- [ ] Search, Add and Import stay on one row at supported widths.
- [ ] At 320px controls do not clip or overflow.
- [ ] Compact icon treatment retains explicit accessible names.

### FR-2 — Preserve behaviour

- [ ] Search/clear behaviour is unchanged.
- [ ] Add opens manual authoring and Import opens URL import.
- [ ] Toolbar actions never trigger recipe detail opening.

### FR-3 — Consistent density

- [ ] Heading uses the shared page-heading token.
- [ ] Toolbar-to-grid spacing is compact.
- [ ] Text zoom and long labels remain operable.

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

- Use CSS layout and existing controls; no new state system.
- Search is flexible width; action controls are stable width.
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

- [ ] Verify 320px mobile toolbar and four-column grid.
- [ ] Run Search, Add and Import by touch and keyboard.
- [ ] Confirm tile opening still works.

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

PR title: `[CS-53] UX-R1 — Compact the Recipe Library Action Toolbar`

Include Jira/package links, principles and effort removed, implementation, tests, Preview evidence, migration/Edge declarations, security/accessibility, limitations, rollback and cost.
