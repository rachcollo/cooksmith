# Engineering Package — CS-83: Orchard foundations, fonts and token migration

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-83
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `Ready`
- **Branch:** `feat/cs-83-orchard-foundations-tokens`
- **Depends on:** Merged PR #94 design handoff
- **Blocks:** CS-84 and every Orchard route package
- **Package path:** `engineering/ready/cs83-orchard-foundations-tokens.md`

## Product Outcome

Install the canonical Orchard foundations once so later screen migrations share exact fonts, tokens, surfaces, focus states and British token naming without changing product behaviour.

## Current Baseline

The merged Orchard handoff under docs/design/orchard is authoritative. Current styling contains token drift including American --color-* references.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Exact Fontsource 5.3.0 packages and approved weight imports.
- Orchard tokens and canonical --colour-* naming; normalise all --color-* references.
- Global typography, focus, radii, shadows, motion and base surfaces.
- Lockfile update and documented A$0/no-runtime-request delivery.

### Explicitly Out of Scope

- Shared component redesign, navigation migration or route restyling.
- Future-concept screens or product behaviour changes.
- Compatibility aliases beyond an evidenced temporary necessity.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-83 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Follow docs/design/orchard written precedence and migration-safe references only.
- [ ] Import only approved local font weights at the application entry point.
- [ ] Preserve semantic token intent and remove drift in this phase; do not defer American names.
- [ ] Keep all application behaviour and test selectors unchanged.

### FR-3 — Quality and evidence

- [ ] Verify fonts load from bundled assets with no runtime font request.
- [ ] Assert zero var(--color-* references in src/.
- [ ] Contrast, focus-visible, reduced-motion and fallback checks.
- [ ] Full format, lint, typecheck, unit/integration and production build validation.
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

- Follow docs/design/orchard written precedence and migration-safe references only.
- Import only approved local font weights at the application entry point.
- Preserve semantic token intent and remove drift in this phase; do not defer American names.
- Keep all application behaviour and test selectors unchanged.

## Test Plan

- Verify fonts load from bundled assets with no runtime font request.
- Assert zero var(--color-* references in src/.
- Contrast, focus-visible, reduced-motion and fallback checks.
- Full format, lint, typecheck, unit/integration and production build validation.

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

PR title: `CS-83: Orchard foundations, fonts and token migration`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
