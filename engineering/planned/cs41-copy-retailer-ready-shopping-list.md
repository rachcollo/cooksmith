# Engineering Package — CS-41: Copy a Retailer-ready Shopping List

## Metadata
- **Milestone:** M10C
- **Jira issue:** CS-41
- **Epic:** Shopping Lists (CS-6)
- **Status:** Planned
- **Branch:** `feat/cs-41-copy-retailer-shopping-list`
- **Depends on:** CS-21 and CS-22
- **Blocks:** None
- **Package path:** `engineering/planned/cs41-copy-retailer-ready-shopping-list.md`

## Product Outcome
Households review and copy lossless plain text for Coles or Woolworths search without Cooksmith claiming cart integration or product matching.

## Current Baseline
- Active list contains manual/generated rows with CS-22 aggregation.
- No retailer API/credential is approved.
- Clipboard must degrade to selectable text.
Verify against latest remote `main`, Jira, migrations, open PRs and tests before Ready. Material conflict is a stop condition.

## Scope
### Included
- Copy for online order action.
- Editable export preview that does not mutate Cooksmith.
- Uncompleted active items, quantities and stable ordering.
- Clipboard confirmation and manual-copy fallback.
### Explicitly Out of Scope
- Retailer login/cart/API
- Prices/availability/product matching
- Browser automation
- Second persisted retailer list

## Functional Requirements and Acceptance Criteria
### FR-1 — Lossless preview
- [ ] Preview comes from latest active list.
- [ ] Completed/removed/suppressed rows excluded by default.
- [ ] No brand, pack size or product invented.

### FR-2 — Safe edit and copy
- [ ] Preview edits never mutate shopping records.
- [ ] Success announced accessibly.
- [ ] Clipboard failure leaves selectable text.

### FR-3 — Practical output
- [ ] One item per line works in Notes/retailer search.
- [ ] Fractions, Unicode, long lists and missing quantity are safe.
- [ ] No claim of automatic cart import.

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
- Format client-side from authorised current list unless server need is proven.
- Reuse existing dialog/sheet and clipboard fallback patterns.
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
- [ ] Copy on iOS-sized mobile and desktop.
- [ ] Edit preview and prove underlying list unchanged.
- [ ] Test completed/generated/long/fraction items and clipboard denial.

## Definition of Done
- [ ] Acceptance criteria and regressions pass.
- [ ] Household isolation and adjacent journeys remain intact.
- [ ] GitHub Actions/Vercel pass on exact PR head and hosted evidence is recorded.
- [ ] Migration, Edge, Production, privacy, accessibility and cost impact are explicit.
- [ ] PR merged/released, Jira Done and package moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** None.
- **Expected Edge Function:** None unless explicitly approved.
- **Rollback:** Revert UI/application; use forward fix for released immutable migration.
- **New dependency/provider:** None expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements
PR title: `[CS-41] M10C — Copy a Retailer-ready Shopping List`
Include Jira/package, principles/effort removed, implementation, tests, Preview, release declarations, security/accessibility, limitations, rollback and cost.
