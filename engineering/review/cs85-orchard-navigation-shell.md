# Engineering Package — CS-85: Orchard navigation and application shell

## Metadata

- **Milestone:** Orchard Editorial
- **Jira issue:** CS-85
- **Epic:** CS-82 — Orchard Editorial design-system migration
- **Status:** `In Review`
- **Branch:** `feat/cs-85-orchard-navigation-shell`
- **Depends on:** CS-83 and CS-84
- **Blocks:** CS-86, CS-87 and CS-88
- **Package path:** `engineering/review/cs85-orchard-navigation-shell.md`

## Product Outcome

Give Cooksmith one coherent Orchard frame across mobile and desktop while preserving every current route, icon, order and accessible active state.

## Current Baseline

Cooksmith has six mobile destinations and seven desktop destinations including Settings. The migration-safe references demonstrate the approved rail, bottom navigation, brand mark and responsive frame.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Mobile bottom navigation, desktop rail, header, canonical brand mark and responsive page frame.
- Six mobile destinations and seven desktop destinations in verified order.
- Existing Lucide icons, aria-current behaviour, active lime treatment and Orchard spacing.
- Narrow-mobile accommodation for all six labelled destinations.

### Explicitly Out of Scope

- Adding, removing or renaming routes.
- Changing route behaviour or feature availability.
- Route content redesign.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-85 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Preserve House, CookingPot, BookOpen, CalendarDays, ShoppingBasket, Sparkles and Settings icons.
- [ ] Keep route composition in existing app/router boundaries and visual rules in navigation/layout styles.
- [ ] Respect safe areas, direct navigation, refresh/history and desktop Settings-only presentation.
- [ ] Do not hide labels or depend on colour alone to fit narrow widths.

### FR-3 — Quality and evidence

- [ ] Every route activates exactly one correct destination.
- [ ] Keyboard, focus-visible, accessible names and aria-current coverage.
- [ ] Small-mobile, mobile, tablet and desktop overflow/safe-area checks.
- [ ] Direct URL, refresh and history regression tests plus full quality suite.
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

- Preserve House, CookingPot, BookOpen, CalendarDays, ShoppingBasket, Sparkles and Settings icons.
- Keep route composition in existing app/router boundaries and visual rules in navigation/layout styles.
- Respect safe areas, direct navigation, refresh/history and desktop Settings-only presentation.
- Do not hide labels or depend on colour alone to fit narrow widths.

## Test Plan

- Every route activates exactly one correct destination.
- Keyboard, focus-visible, accessible names and aria-current coverage.
- Small-mobile, mobile, tablet and desktop overflow/safe-area checks.
- Direct URL, refresh and history regression tests plus full quality suite.

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

PR title: `CS-85: Orchard navigation and application shell`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
