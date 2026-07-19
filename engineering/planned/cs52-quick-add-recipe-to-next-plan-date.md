# Engineering Package — CS-52: Quick-add a Recipe to the Next Available Plan Date

## Metadata

- **Milestone:** M08D
- **Title:** Quick-add a Recipe to the Next Available Plan Date
- **Jira issue:** CS-52
- **Epic:** Meal Planning (CS-4)
- **Status:** Planned
- **Branch:** `feat/cs-52-quick-add-recipe-planner`
- **Depends on:** CS-20 and CS-49
- **Blocks:** None
- **Package path:** `engineering/planned/cs52-quick-add-recipe-to-next-plan-date.md`

## Product Outcome

A household member can add a recipe to their meal plan directly from the Recipe Library with one tap. A compact plus action on each recipe tile selects the earliest eligible date automatically, links the recipe as dinner and confirms where it was placed.

This supports the Cooksmith principles **Save people time**, **Reduce mental load**, **One tap is always better than five** and **Don’t make users think if Cooksmith can think for them**. It removes opening the planner, finding an empty day, opening the meal form and selecting the same recipe again. The primary action remains obvious on a phone without turning each compact tile into a panel of controls.

## Current Baseline

The implementation agent must verify these statements against the latest remote `main` before moving this package to Ready or editing product code:

- The Recipe Library presents compact recipe tiles whose main surface opens recipe details.
- The planner supports household-local Monday-to-Sunday dates and recipe-linked planned meals.
- CS-20 established the linked-recipe planner path.
- CS-49 owns the defect affecting recipe-bank selections in that planner path and must be merged and verified before this package becomes eligible.
- Planned meals can coexist on a date. CS-52 deliberately defines an “available date” as a date containing zero planned meals, rather than an available position within a populated day.
- Planner mutations and recipe visibility must preserve existing household, public-recipe and private-recipe authorisation rules.
- No current authoritative operation is assumed to search indefinitely for an empty future date; the implementation must inspect the current application and persistence boundaries before choosing the smallest safe query.

Material disagreement between this baseline, Jira and current `main` is a stop condition. Update the package rather than improvising broader planner behaviour.

## Scope

### Included

- Add one compact plus action at the bottom-right of every recipe tile.
- Find the earliest household-local date on or after today that contains no planned meals.
- Create one dinner linked to the selected recipe on that date using the existing authorised planner contract.
- Continue the chronological search beyond the currently displayed week when necessary.
- Provide busy, success, undo and recoverable error behaviour.
- Protect against duplicate creation from repeated activation or concurrent stale availability results.
- Cover public recipes visible to the user and private recipes the user is authorised to plan.
- Preserve tile-to-details, planner editing/removal and CS-22 shopping-list generation behaviour.

### Explicitly Out of Scope

- Asking the user to choose a date or meal type before quick-add.
- Filling a partially populated date, replacing a meal or reordering existing meals.
- Adding to a past date.
- Drag-and-drop, batch planning, recurring meals, meal-plan templates or AI recommendations.
- Changing recipe visibility, import, author attribution or ownership rules.
- Changing shopping-list aggregation, pantry reconciliation or ingredient parsing.
- A database migration unless baseline inspection proves an atomic server operation cannot safely meet the concurrency contract.
- New dependencies, hosted providers, background jobs or paid services.

## Functional Requirements

### FR-1 — Present a distinct quick-add action

Each visible recipe tile must expose a compact plus action in its bottom-right corner while the remaining tile surface continues to open recipe details.

**Acceptance criteria**

- [ ] Every public or permitted private recipe tile displays the plus action consistently across supported views.
- [ ] Activating the plus does not trigger the tile's detail action.
- [ ] The action remains visible and operable at representative mobile, tablet and desktop widths.
- [ ] Existing recipe search, filtering, card opening and recipe actions remain intact.
- [ ] The plus is not rendered for a recipe the current user cannot validly link to their active household plan.

### FR-2 — Select the next available date deterministically

“Next available” means the earliest household-local calendar date on or after today that contains zero planned meals.

**Acceptance criteria**

- [ ] If today contains no planned meals, today is selected.
- [ ] If today contains one or more planned meals, the search advances one date at a time.
- [ ] A populated date is never selected even if it has no dinner specifically.
- [ ] Past dates are never selected.
- [ ] The search crosses week boundaries and is not limited to the week currently open in the planner.
- [ ] Date calculation uses the existing household-local date convention and is deterministic around browser timezone and daylight-saving boundaries.
- [ ] The implementation uses a documented bounded query strategy; it does not issue an unbounded client request per day.

### FR-3 — Create a linked dinner safely

The selected recipe must be added through the existing authoritative recipe-linked planner path with dinner as the safe default.

**Acceptance criteria**

- [ ] The created meal stores the selected recipe link and the existing title snapshot or equivalent fallback required by the planner contract.
- [ ] The meal type defaults to dinner without presenting another form.
- [ ] Existing meals are never overwritten, moved, unlinked or deleted.
- [ ] Public recipes and the current user's permitted private recipes follow the same authorisation contract as planner recipe selection.
- [ ] Another user's private recipe and cross-household plan identifiers are rejected.
- [ ] CS-22 shopping-list reconciliation is invoked through the same authoritative planned-meal operation when that behaviour exists on `main`; quick-add must not bypass it.

### FR-4 — Resolve stale availability and repeated activation

The action must not create duplicate meals or overwrite a date selected from stale client state.

**Acceptance criteria**

- [ ] The plus becomes busy and cannot be reactivated while its request is unresolved.
- [ ] Rapid taps, keyboard repeat and a retried response do not create duplicate planned meals for one user action.
- [ ] If another household action fills the candidate date before commit, the operation either selects the next empty date atomically or returns a recoverable conflict that can be retried safely.
- [ ] The implementation documents its idempotency or request-correlation rule and tests it.
- [ ] A failed operation leaves existing planner and shopping-list state unchanged.

### FR-5 — Confirm placement and support undo

A successful quick-add must tell the user what happened without forcing navigation away from the Recipe Library.

**Acceptance criteria**

- [ ] Success feedback names the recipe and formats the selected date clearly.
- [ ] Feedback is announced once to assistive technology and does not move focus unexpectedly.
- [ ] Undo removes exactly the planned meal created by that quick-add using the current authorised removal path.
- [ ] Undo also invokes any existing CS-22 contribution reconciliation; ingredients still required by other planned meals remain intact.
- [ ] If undo fails, the created meal remains visible in authoritative state and the user receives a useful recovery message.
- [ ] The success message may offer a secondary route to view the planner, but navigation is not required.

### FR-6 — Recover from errors calmly

Loading and failure states must preserve the one-tap outcome without hiding important failures.

**Acceptance criteria**

- [ ] While saving, the selected tile shows a clear non-colour-only busy state.
- [ ] Authorisation, conflict, network and unexpected failures produce safe user-facing copy without raw database or provider details.
- [ ] A recoverable failure permits retry without refreshing the page.
- [ ] Failure does not open recipe details or navigate to the planner.
- [ ] Multiple recipe tiles cannot accidentally share or overwrite each other's pending state.

## UX and Interaction Requirements

- Keep the complete tile, excluding the plus control, as the large detail-opening target.
- Position the plus in the tile's bottom-right visual corner without obscuring the recipe name or breaking the four-column compact mobile layout.
- Use a semantic button with a minimum 44 by 44 CSS-pixel target, visible focus and an accessible name such as “Add [recipe name] to next available date”.
- Do not rely on the plus glyph, colour, hover or animation alone to communicate purpose or state.
- Stop event propagation deliberately so pointer and keyboard activation of the plus never opens details.
- Use concise feedback such as “Satay chicken added to Monday 20 July” with **Undo** as a time-limited convenience; authoritative planner controls remain available after it disappears.
- Respect reduced-motion preferences and safe-area/mobile overflow constraints.
- Do not add a confirmation dialog or date picker to the primary quick-add flow.

## Data and Domain Requirements

- Treat “date contains zero planned meals” as a domain rule, not a presentation-only assumption.
- Calculate from a household-local date value, not an implicitly converted UTC timestamp.
- Derive the active household and caller from the authenticated server boundary; do not trust a client-supplied household as authority.
- Read recipe visibility and create the planned meal within the existing authorised contracts.
- Prefer an existing transactional RPC/application service if it can atomically validate recipe access, choose or revalidate the date, create the meal and trigger shopping reconciliation.
- If the current contract cannot resolve concurrent claims safely, propose the smallest additive forward migration and document why before implementing it. Do not weaken constraints or RLS.
- Use a stable request identifier or equivalent database-backed idempotency mechanism if the current planner API does not already provide one.
- Undo targets the exact created planned-meal identifier, never a recipe/date search that could remove another user's intended meal.
- Do not scan or mutate Production data while building or validating this package.

## Technical Direction

- Keep date-selection logic framework-independent and unit-testable.
- Reuse Recipe Library tile, planner application service, linked-recipe and shopping-reconciliation contracts rather than duplicating persistence logic in the component.
- Prefer one bounded server round trip for availability and creation. If existing architecture requires client orchestration, revalidate availability authoritatively before commit and document the concurrency limitation.
- Query a bounded future window using set-based data access, select the first missing date, and define a clear exhausted-window response. A reasonable initial window must be justified against existing planner conventions rather than hard-coded silently.
- Keep per-tile pending state keyed by recipe identity or request identity.
- Invalidate or update planner and shopping-list caches only after authoritative success.
- Do not add a third-party date, state-management or notification dependency for this feature.
- Record a durable ADR only if implementation introduces a new cross-domain mutation or idempotency pattern that is not already governed.

## Implementation Guidance

1. Confirm CS-20 and CS-49 are Done and merged on current remote `main`.
2. Check Jira has moved CS-52 to Ready and has `codex-ready` only after all dependencies are complete.
3. Move this package from `engineering/planned/` to `engineering/ready/` and update the engineering index in the readiness PR.
4. Inspect recipe tile composition, detail activation, current planner create/remove operations, household-local date utilities, recipe visibility, CS-22 shopping reconciliation and relevant tests.
5. Write the date-selection, idempotency/concurrency and undo invariants before implementation.
6. Add the smallest safe application/domain operation and any justified additive database change.
7. Add the tile action and feedback states without changing unrelated Recipe Library layout.
8. Add automated coverage across unit, component, integration, database/RLS where applicable, end-to-end, accessibility and responsive layers.
9. Run the complete mandatory quality suite and migration checks if the database changes.
10. Validate the exact hosted Preview journeys below with synthetic households before requesting merge.

## Security and Privacy

- Require an authenticated active household member.
- Authorise recipe visibility and the target household at the server/database boundary.
- Reject forged household, recipe, plan, planned-meal and undo identifiers.
- Preserve RLS and least-privilege grants for any changed database surface.
- Security-definer functions, if required, use `set search_path = ''`, fully qualified identifiers, explicit membership checks and restricted grants.
- Do not expose another user's private recipe, household schedule or shopping contributions through success/error responses.
- Keep logs free of recipe content, household notes, email addresses and credentials.
- Use only synthetic fixtures and screenshots.

## Accessibility

- The action is a semantic button with a recipe-specific accessible name.
- Keyboard Enter and Space activation perform quick-add once and do not open details.
- Focus remains on the action after loading, success or recoverable failure.
- Busy, success and failure states are announced once through appropriate status semantics.
- The target is at least 44 by 44 CSS pixels without causing horizontal overflow at 320 CSS pixels.
- Visible focus meets WCAG 2.2 AA and is not clipped by tile overflow.
- Automated axe coverage is supplemented by manual keyboard and screen-reader checks.

## Test Plan

### Unit tests

- Earliest empty date when today is empty.
- Skipping today and multiple populated dates.
- Crossing week, month, year and daylight-saving boundaries using household-local dates.
- Populated breakfast/lunch-only dates still count as unavailable.
- Bounded-window exhausted result.
- Stable request/idempotency behaviour.
- Success and failure message date formatting.

### Component tests

- Plus placement and accessible name.
- Tile detail action remains separate.
- Pointer, Enter and Space activation stop propagation.
- Per-tile busy/disabled state and repeat protection.
- Success, undo and recoverable error feedback.
- Focus retention and live-region behaviour.
- Public and permitted private recipe variants.

### Integration tests

- Quick-add links the selected recipe and chooses the earliest empty date.
- A full current week continues into the next week.
- Public and permitted private recipes succeed; unauthorised private recipes fail.
- Existing meals remain unchanged.
- Stale candidate-date conflict is resolved or returned safely.
- Repeated request does not create a duplicate.
- Undo removes only the newly created meal.
- CS-22 generated ingredients appear after quick-add and reconcile after undo without removing contributions required by another meal.

### Database and RLS tests, if the database boundary changes

- Owner and active member allowed paths.
- Inactive member, unrelated user and unauthenticated denial.
- Forged household, recipe, planned-meal and idempotency identifiers.
- Concurrent candidate-date claims.
- Additive migration, grants, RLS and generated-type freshness.
- Fresh reset, lint and pgTAP coverage.

### End-to-end and responsive tests

- Mobile recipe tile quick-add to an empty today.
- Skip populated dates and cross into a later week.
- Detail opening remains functional when the plus is not selected.
- Rapid repeated activation creates one meal.
- Success feedback and undo.
- Planner and shopping list show authoritative post-add/post-undo state.
- Keyboard-only operation and automated axe scan.
- No horizontal overflow at 320, 375 and representative desktop widths.

### Hosted Preview validation

Using synthetic household and recipe data:

1. Open the exact Vercel Preview URL on mobile and desktop.
2. Confirm the plus is visible, reachable and does not open recipe details.
3. With today empty, add a public recipe and confirm today's dinner in the planner.
4. Populate today and the remaining current-week dates, quick-add another recipe and confirm placement in the next empty future date.
5. Add a permitted private recipe and verify another user's private recipe cannot be used.
6. Confirm CS-22 adds ingredients, then undo and confirm only that meal's contributions are removed.
7. Confirm another recipe contributing the same ingredient retains its required contribution.
8. Retry after a simulated/recoverable failure and confirm one meal is created.
9. Verify keyboard focus, screen-reader announcement, reduced motion and no mobile overflow.

Record the Preview URL, browser/device, synthetic scenario, actual result and any unverified assistive-technology checks in the PR. Do not claim this validation before it is performed.

## Quality Gates

- [ ] `npm run preflight` passes.
- [ ] `npm ci` completes.
- [ ] `npm run format` and `npm run format:check` pass.
- [ ] `npm run docs:commands:check` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Relevant Playwright, responsive and axe suites pass.
- [ ] Database reset, lint, pgTAP, RLS and generated-type freshness pass if a migration or database contract changes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] Hosted Preview is manually validated.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Jira contains the package path, PR, Preview evidence and current status.

## Definition of Done

- [ ] Every functional and UX acceptance criterion is met.
- [ ] Automated coverage protects date selection, one-action creation, concurrency, undo, authorisation and CS-22 integration.
- [ ] Recipe details, planner operations, shopping reconciliation and household isolation remain intact.
- [ ] No migration or Edge Function release is required, or any required release is explicitly declared and completed through the protected post-merge workflow.
- [ ] Hosted Preview mobile, desktop, keyboard and available assistive-technology checks are recorded.
- [ ] PR checks and review pass.
- [ ] Completion report and handover record actual evidence and baseline SHA.
- [ ] Jira moves through In Review, Testing and Done at the corresponding delivery events.
- [ ] The package moves to `engineering/completed/` after merge and release verification.

## Release, Rollback and Cost

- **Expected migration impact:** None. If concurrency safety requires a database change, use an additive migration and declare it before implementation review.
- **Expected Edge Function impact:** None.
- **Production deployment:** Merging to `main` deploys the current private MVP application. A database migration, if introduced later, requires the protected Production database release workflow after merge against the exact approved `main` SHA.
- **Rollback:** Revert the UI/application change if no migration exists. If a migration is added, preserve the immutable migration and use a forward fix; disabling the plus action must not strand or delete existing planned meals.
- **Dependencies:** No new dependency is expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `[CS-52] M08D — Quick-add a Recipe to the Next Available Plan Date`

Include the Jira issue, package path, supported Product Principles, user effort removed, implementation summary, migration and Edge Function declarations, accessibility/security notes, automated checks, hosted Preview evidence, screenshots or recording, limitations, rollback approach and cost impact.
