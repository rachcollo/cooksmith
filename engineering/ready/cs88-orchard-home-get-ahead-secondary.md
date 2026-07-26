# Engineering Package — CS-88: Orchard Home, Get Ahead and secondary routes

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-88
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `Ready`
- **Branch:** `feat/cs-88-orchard-home-get-ahead-secondary`
- **Depends on:** CS-83, CS-84 and CS-85
- **Blocks:** CS-89
- **Package path:** `engineering/ready/cs88-orchard-home-get-ahead-secondary.md`

## Product Outcome

Complete Orchard across Home, Get Ahead and secondary journeys so users do not encounter legacy visual islands outside the headline routes.

## Current Baseline

Home remains the current foundation screen. Get Ahead already has duration, consolidation, checklist, progress, override, defer/skip and end-early states. The aspirational dashboard is future work.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Current foundation Home screen only.
- Implemented Get Ahead session and consolidation model.
- Settings, onboarding, invitation acceptance, authentication, not-found and route-error surfaces.
- Dialogs/sheets and empty, loading, error, confirmation, long-content and narrow-mobile states.

### Explicitly Out of Scope

- Future Home meal dashboard or new data requirements.
- New Get Ahead capabilities or changed session logic.
- Auth, invitation, onboarding or route behaviour changes.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-88 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Preserve existing application/domain boundaries and auth/route guards.
- [ ] Use migration-safe references only and apply written system rules where no dedicated reference exists.
- [ ] Keep accessible names, roles, focus management and automation identifiers stable.
- [ ] Do not allow visual migration to change provider, persistence or household permissions.

### FR-3 — Quality and evidence

- [ ] Home and full Get Ahead state-machine regression coverage.
- [ ] Hosted preview plan for auth/onboarding/invitation surfaces without claiming unperformed validation.
- [ ] Not-found/error, dialog/sheet focus and recovery checks.
- [ ] Small-mobile/desktop reference checks, axe, lint, typecheck, tests and build.
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

- Preserve existing application/domain boundaries and auth/route guards.
- Use migration-safe references only and apply written system rules where no dedicated reference exists.
- Keep accessible names, roles, focus management and automation identifiers stable.
- Do not allow visual migration to change provider, persistence or household permissions.

## Test Plan

- Home and full Get Ahead state-machine regression coverage.
- Hosted preview plan for auth/onboarding/invitation surfaces without claiming unperformed validation.
- Not-found/error, dialog/sheet focus and recovery checks.
- Small-mobile/desktop reference checks, axe, lint, typecheck, tests and build.

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

PR title: `CS-88: Orchard Home, Get Ahead and secondary routes`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
