# Engineering Package — CS-86: Orchard Recipes and Pantry route migration

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-86
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `In Review`
- **Branch:** `feat/cs-86-orchard-recipes-pantry`
- **Depends on:** CS-83, CS-84 and CS-85
- **Blocks:** CS-89
- **Package path:** `engineering/review/cs86-orchard-recipes-pantry.md`

## Product Outcome

Move Recipes and Pantry to Orchard while preserving their existing low-effort search, authoring, editing, availability and categorisation workflows.

## Current Baseline

Recipes supports name search and free-string tags; Pantry uses boolean availability and current filters/categorisation. Migration-safe references deliberately exclude future taxonomy chips and segmented stock.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Recipes list, detail, authoring, add/edit/delete and quick-add surfaces.
- Pantry list, filters, boolean availability, categorisation and insights.
- Generic Tag, Badge, photo-frame and placeholder patterns.
- Loading, empty, filtered-empty, error, long-content, dialog and busy states.

### Explicitly Out of Scope

- Recipe taxonomy/filter chips or automatic tag colour semantics.
- Segmented pantry stock or confirmation workflows.
- Any change to persistence, permissions or product behaviour.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-86 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Reuse shared Orchard components; keep feature-specific layout in feature styles.
- [ ] Preserve data contracts, validation, test identifiers and optimistic/error recovery.
- [ ] Avoid truncating required names or quantities at narrow widths.
- [ ] Use safe reference PNGs and written route rules; future-concepts are non-authoritative.

### FR-3 — Quality and evidence

- [ ] Existing Recipes and Pantry workflow regression coverage.
- [ ] Long names, arbitrary tags, filtered empty, validation and failure recovery.
- [ ] Keyboard, dialog focus, accessible controls and axe checks.
- [ ] Mobile/desktop reference comparison, no overflow, lint, typecheck, tests and build.
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

- Reuse shared Orchard components; keep feature-specific layout in feature styles.
- Preserve data contracts, validation, test identifiers and optimistic/error recovery.
- Avoid truncating required names or quantities at narrow widths.
- Use safe reference PNGs and written route rules; future-concepts are non-authoritative.

## Test Plan

- Existing Recipes and Pantry workflow regression coverage.
- Long names, arbitrary tags, filtered empty, validation and failure recovery.
- Keyboard, dialog focus, accessible controls and axe checks.
- Mobile/desktop reference comparison, no overflow, lint, typecheck, tests and build.

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

PR title: `CS-86: Orchard Recipes and Pantry route migration`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
