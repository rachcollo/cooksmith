# Engineering Package — CS-89: Orchard accessibility, responsive verification and legacy cleanup

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-89
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `Review`
- **Branch:** `feat/cs-89-orchard-verification-cleanup`
- **Depends on:** CS-83 through CS-88 merged
- **Blocks:** Completion of CS-82
- **Package path:** `engineering/review/cs89-orchard-verification-cleanup.md`

## Product Outcome

Prove the Orchard migration is complete and accessible, then remove only evidenced dead legacy styles and temporary compatibility tokens.

## Current Baseline

This final package starts only after every Orchard implementation package has landed. It must audit the integrated application rather than masking incomplete route work.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Every route, state and overlay audit against written Orchard rules and safe references.
- Small-mobile, standard-mobile, tablet and desktop verification.
- Keyboard, focus-visible, names, contrast, status cues and reduced-motion checks.
- Removal of deprecated tokens, aliases, dead selectors and obsolete feature styles backed by usage evidence.
- Before/after evidence and final handover linking all implementation PRs and deferrals.

### Explicitly Out of Scope

- Changing product behaviour or implementing future concepts.
- Removing styles still used by any route.
- Unrelated refactors or new dependencies.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-89 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Use repository search, coverage and visual evidence to justify each deletion.
- [ ] Confirm zero --color-* references and zero temporary aliases after integrated build.
- [ ] Keep cleanup in a final forward commit; do not rewrite earlier migration history.
- [ ] Document any manual assistive-technology or device limitation precisely.

### FR-3 — Quality and evidence

- [ ] Full required quality suite and repository governance.
- [ ] Representative Playwright responsive/overflow and screenshot evidence.
- [ ] Keyboard journey, focus order, accessible-name, axe and contrast review.
- [ ] Production-like build and Vercel Preview smoke plan across all routes.
- [ ] Dead-style/token scan with recorded evidence and regression coverage.
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

- Use repository search, coverage and visual evidence to justify each deletion.
- Confirm zero --color-* references and zero temporary aliases after integrated build.
- Keep cleanup in a final forward commit; do not rewrite earlier migration history.
- Document any manual assistive-technology or device limitation precisely.

## Test Plan

- Full required quality suite and repository governance.
- Representative Playwright responsive/overflow and screenshot evidence.
- Keyboard journey, focus order, accessible-name, axe and contrast review.
- Production-like build and Vercel Preview smoke plan across all routes.
- Dead-style/token scan with recorded evidence and regression coverage.

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

PR title: `CS-89: Orchard accessibility, responsive verification and legacy cleanup`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
