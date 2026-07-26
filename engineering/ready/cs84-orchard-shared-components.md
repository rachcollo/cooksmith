# Engineering Package — CS-84: Orchard shared components and visual states

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-84
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `Ready`
- **Branch:** `feat/cs-84-orchard-shared-components`
- **Depends on:** CS-83
- **Blocks:** CS-85 and route migrations
- **Package path:** `engineering/ready/cs84-orchard-shared-components.md`

## Product Outcome

Apply Orchard consistently to Cooksmith’s reusable UI primitives so routes can migrate without duplicating styling or embedding colour-named component APIs.

## Current Baseline

CS-83 supplies the stable Orchard tokens and fonts. Existing shared primitives must preserve their semantic APIs and accessibility contracts while gaining the approved visual variants.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Button, IconButton, Panel/Card, Badge, fields, PageHeader, dialogs/sheets and feedback states.
- Semantic Button accent and Panel feature variants.
- Generic Tag with arbitrary label and optional tone.
- Photo frame, placeholder and list-row accent surfaces.
- Default, hover, focus-visible, pressed, disabled, busy, destructive, error and validation states.

### Explicitly Out of Scope

- Route-specific workflow changes or new product actions.
- Colour-named public APIs or fixed recipe taxonomy.
- Navigation/shell and route migration.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-84 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Keep generic components free of household/product business logic.
- [ ] Use semantic props and existing accessible names/roles; decorations remain assistive-technology silent.
- [ ] Avoid one-off route selectors in shared component modules.
- [ ] Preserve 44px targets, visible focus and reduced-motion support.

### FR-3 — Quality and evidence

- [ ] Component behaviour and accessible-name tests for every interactive state.
- [ ] Keyboard, focus, disabled/busy and destructive-state coverage.
- [ ] Automated axe/contrast checks and colour-independent status cues.
- [ ] Responsive component examples plus format, lint, typecheck, tests and build.
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

- Keep generic components free of household/product business logic.
- Use semantic props and existing accessible names/roles; decorations remain assistive-technology silent.
- Avoid one-off route selectors in shared component modules.
- Preserve 44px targets, visible focus and reduced-motion support.

## Test Plan

- Component behaviour and accessible-name tests for every interactive state.
- Keyboard, focus, disabled/busy and destructive-state coverage.
- Automated axe/contrast checks and colour-independent status cues.
- Responsive component examples plus format, lint, typecheck, tests and build.

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

PR title: `CS-84: Orchard shared components and visual states`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
