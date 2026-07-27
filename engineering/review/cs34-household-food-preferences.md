# Engineering Package — CS-34: Household food preferences and cooking context

## Metadata

- **Milestone:** Households
- **Jira issue:** CS-34
- **Epic:** CS-2 — Households
- **Status:** `Ready`
- **Branch:** `feat/cs-34-household-food-preferences`
- **Depends on:** CS-10 and CS-11 (delivered household and membership foundations)
- **Blocks:** Personalised planning, recommendation and Get Ahead consumers
- **Package path:** `engineering/ready/cs34-household-food-preferences.md`

## Product Outcome

Give each household one optional, editable profile that clearly separates person-specific and household-wide safety constraints from soft food and cooking preferences, so future recommendations are safer and more useful without adding mandatory setup friction.

## Current Baseline

Cooksmith already has household membership, settings and RLS foundations, but no single typed household-preferences contract for people cooked for, hard safety constraints and soft recommendation signals.

Implementation must begin from the latest accepted `main`, recheck all referenced files and dependencies, and follow `docs/engineering/CODEX_BUILD_RULES.md`, the AIEOS lifecycle, Product Principles and relevant specialist standards.

## Scope

### Included

- Household settings flow for login and non-login people profiles.
- Person-specific allergies/intolerances and household-wide dietary requirements, stored as hard constraints.
- Favourite cuisines, liked/avoided foods, confidence, weeknight time band and preferred store as optional soft preferences.
- Partial save, sensible selectable options, explicit confirmation when weakening/removing a safety constraint, and household-scoped persistence.
- A typed downstream read contract that keeps hard constraints separate from soft preferences.

### Explicitly Out of Scope

- Medical advice or allergen guarantees.
- Per-day planning overrides, grocery ordering or live store catalogue integration.
- Rewriting existing recipes, plans or shopping lists.
- Advanced roles, voting or preference-weighting algorithms.

## Functional Requirements and Acceptance Criteria

### FR-1 — Approved outcome and preserved behaviour

- [ ] Deliver the Jira-approved outcome for CS-34 without expanding into excluded work.
- [ ] Preserve all existing workflows, routing, validation, permissions, accessible names and automation identifiers not explicitly changed by this package.
- [ ] Failure, empty and unavailable states remain safe, understandable and recoverable.

### FR-2 — Implementation contract

- [ ] Model people cooked for separately from authenticated membership so child/non-login profiles do not imply access.
- [ ] Use additive household-scoped tables/contracts, existing active-membership helpers and RLS; never authorise from frontend state.
- [ ] Keep canonical option identifiers stable while preserving user-entered “other” values; handle retired options without data loss.
- [ ] Expose one application/domain contract for downstream consumers rather than separate preference stores.

### FR-3 — Quality and evidence

- [ ] Domain validation for hard versus soft classification, partial profiles and stable option identifiers.
- [ ] Database/RLS coverage for owner/member access, unrelated/inactive/unauthenticated denial and non-login profiles.
- [ ] Component/integration coverage for edit, skip, validation recovery and explicit safety-constraint removal confirmation.
- [ ] Responsive and accessibility checks for labels, multi-selects, errors, focus and no horizontal overflow.
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

- Model people cooked for separately from authenticated membership so child/non-login profiles do not imply access.
- Use additive household-scoped tables/contracts, existing active-membership helpers and RLS; never authorise from frontend state.
- Keep canonical option identifiers stable while preserving user-entered “other” values; handle retired options without data loss.
- Expose one application/domain contract for downstream consumers rather than separate preference stores.

## Test Plan

- Domain validation for hard versus soft classification, partial profiles and stable option identifiers.
- Database/RLS coverage for owner/member access, unrelated/inactive/unauthenticated denial and non-login profiles.
- Component/integration coverage for edit, skip, validation recovery and explicit safety-constraint removal confirmation.
- Responsive and accessibility checks for labels, multi-selects, errors, focus and no horizontal overflow.

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

PR title: `CS-34: Household food preferences and cooking context`

Link Jira and this package; state the approved outcome, preserved behaviour, exact baseline, changed files, tests and real results, Preview/manual evidence, migrations, Edge Functions, production release needs, rollback, security/privacy and monthly/annual cost.
