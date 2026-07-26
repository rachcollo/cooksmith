# Engineering Package — CS-87: Orchard Plan and Shopping route migration

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-87
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `Ready`
- **Branch:** `feat/cs-87-orchard-plan-shopping`
- **Depends on:** CS-83, CS-84 and CS-85
- **Blocks:** CS-89
- **Package path:** `engineering/ready/cs87-orchard-plan-shopping.md`

## Product Outcome

Unify weekly planning and Shopping visually under Orchard while keeping all seven-day planning, movement and list-management behaviour intact.

## Current Baseline

Plan is a seven-day weekly planner with previous/next navigation, generation and pointer/keyboard movement. Shopping groups items, completes them and reconciles Pantry; future fortnight, locks and retailer export are excluded.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Seven-day Plan cards, day slots, add/edit/remove/replace, weekly generation, drag/drop and keyboard movement.
- Shopping groups, complete/uncomplete, pantry reconciliation and put-away proposals.
- Orchard empty slots, category headers, rows, checkboxes, badges and feedback.
- Empty/partial weeks, generating/busy, long names, empty Shopping and completed items.

### Explicitly Out of Scope

- Fortnight planning, persistent meal locks or retailer copy/export.
- Any alteration to plan persistence, Shopping grouping or Pantry reconciliation.
- New interactions from future-concept references.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-87 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Preserve pointer and keyboard paths as equivalent operations.
- [ ] Keep date/week calculations and household data boundaries unchanged.
- [ ] Use shared components and feature styles without duplicating foundation tokens.
- [ ] Maintain optimistic rollback and visible recoverable failure states.

### FR-3 — Quality and evidence

- [ ] Seven-day previous/next, add/edit/remove/replace and generation regressions.
- [ ] Pointer drag/drop and keyboard movement equivalence.
- [ ] Shopping grouping, completion persistence, reconciliation and put-away behaviour.
- [ ] Empty/busy/long-content, mobile/desktop, accessibility and full quality suite.
- [ ] Record exact baseline and implementation commits, changed files, validation evidence, Preview status, migration/Edge declarations, security/privacy review and cost impact in the PR and handover.

## UX and Accessibility

- Apply Cooksmith Product Principles: quietly remove work, minimise human steps, use Australian/UK English and avoid dead or decorative controls that imply unavailable actions.
- Target WCAG 2.2 AA with semantic structure, visible focus, keyboard operation, 44px touch targets, colour-independent status, reduced-motion support and responsive layouts without horizontal overflow.
- Preserve entered data and user context through validation or recoverable failures.

## Data, Security and Privacy

- Derive household and role authority at trusted boundaries; client state is never an authorisation source.
- Keep all reads and writes household-scoped and least-privilege; add adversarial RLS coverage when persistence or access policy changes.
- Use only synthetic fixtures. Do not log or commit secrets, provider payloads, real household data or sensitive preference/recipe content.
- Any database change must be additive, migration-safe, generated-type current and released only after merge through the protected production workflow.

## Technical Direction

- Preserve pointer and keyboard paths as equivalent operations.
- Keep date/week calculations and household data boundaries unchanged.
- Use shared components and feature styles without duplicating foundation tokens.
- Maintain optimistic rollback and visible recoverable failure states.

## Test Plan

- Seven-day previous/next, add/edit/remove/replace and generation regressions.
- Pointer drag/drop and keyboard movement equivalence.
- Shopping grouping, completion persistence, reconciliation and put-away behaviour.
- Empty/busy/long-content, mobile/desktop, accessibility and full quality suite.

## Quality Gates

- [ ] `npm run preflight` and `npm ci` complete.
- [ ] `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] Applicable docs, security, dependency, database/RLS, generated-type, Playwright, responsive and axe checks pass.
- [ ] Vercel Preview and any required hosted flow are tested and reported separately from local automation.
- [ ] PR governance, Jira evidence, completion report and handover are complete.

## Definition of Done

- [ ] Every acceptance criterion is implemented and evidenced without excluded scope.
- [ ] Security, privacy, household isolation and accessibility obligations are satisfied.
- [ ] Documentation and tests match the delivered behaviour.
- [ ] Required GitHub Actions pass and hosted/manual limitations are explicit.
- [ ] Jira can progress through AIEOS using the package, PR and release evidence.

## Release, Rollback and Cost

- **Expected migration:** Determine during implementation from the approved scope; if none is needed, declare none explicitly. Any migration is forward-only and does not deploy Production from the PR.
- **Expected Edge Function:** Determine during implementation; declare explicitly in the PR.
- **Rollback:** Revert application wiring where safe; use forward fixes for any released schema. Preserve existing household data.
- **New dependency/provider:** None unless explicitly identified, exact-versioned, reviewed and approved.
- **Recurring cost:** A$0/month and A$0/year unless a separate cost approval is completed before implementation.

## PR Requirements

PR title: `CS-87: Orchard Plan and Shopping route migration`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
