# Engineering Package — CS-62: Admin portal and feature toggles

## Metadata

- **Milestone:** Administration
- **Jira issue:** CS-62
- **Epic:** CS-33 — Administration & Public Content
- **Status:** `Ready`
- **Branch:** `feat/cs-62-admin-feature-toggles`
- **Depends on:** Existing authentication, routing and planner Apply behaviour
- **Blocks:** Operational rollout controls for future features
- **Package path:** `engineering/ready/cs62-admin-feature-toggles.md`

## Product Outcome

Provide one secure administration surface for typed feature toggles, beginning with the post-Apply planner confirmation screen, while keeping normal household users out and preserving the current low-friction default.

## Current Baseline

The planner confirmation screen is currently hidden to remove an unnecessary click. Cooksmith does not yet have an approved server-authorised admin role or durable feature-flag contract.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Define and implement a server-enforced administrator authorisation source.
- Protected admin route with a Feature toggles section.
- Typed, secure-default flag contract with name, explanation, state and audit metadata.
- Initial post-Apply confirmation flag defaulting off.
- Predictable reads/writes and tests for allowed and denied access.

### Explicitly Out of Scope

- A paid feature-flag provider, percentage rollouts or experimentation analytics.
- Household-admin permissions or general user-role redesign.
- Changing planner persistence, Shopping reconciliation or failure recovery.
- Building unrelated admin tools.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-62 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Record an ADR if the administrator identity/authorisation source is a new durable architecture decision.
- [ ] Authorise on a trusted server/database boundary; never from email, editable metadata or hidden client UI.
- [ ] Prefer an additive database model with least-privilege functions/RLS and append-only audit evidence.
- [ ] Expose flags through a small typed configuration service with explicit defaults when unavailable.

### FR-3 — Quality and evidence

- [ ] Admin read/write success and non-admin, unrelated, inactive and unauthenticated denial.
- [ ] Default-off and persistence behaviour for the planner confirmation flag.
- [ ] Apply-plan success closes immediately when off; failure remains visible and recoverable.
- [ ] Route protection, keyboard/focus behaviour, mobile layout and audit-record assertions.
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

- Record an ADR if the administrator identity/authorisation source is a new durable architecture decision.
- Authorise on a trusted server/database boundary; never from email, editable metadata or hidden client UI.
- Prefer an additive database model with least-privilege functions/RLS and append-only audit evidence.
- Expose flags through a small typed configuration service with explicit defaults when unavailable.

## Test Plan

- Admin read/write success and non-admin, unrelated, inactive and unauthenticated denial.
- Default-off and persistence behaviour for the planner confirmation flag.
- Apply-plan success closes immediately when off; failure remains visible and recoverable.
- Route protection, keyboard/focus behaviour, mobile layout and audit-record assertions.

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

PR title: `CS-62: Admin portal and feature toggles`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
