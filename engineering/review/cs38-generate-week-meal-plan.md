# Engineering Package — CS-38: Generate a Meal Plan from Recipes or Plan

## Metadata
- **Milestone:** M08E
- **Jira issue:** CS-38
- **Epic:** Meal Planning (CS-4)
- **Status:** In Review
- **Branch:** `feat/cs-38-week-plan-generation`
- **Depends on:** CS-20 and CS-22
- **Blocks:** CS-25
- **Package path:** `engineering/review/cs38-generate-week-meal-plan.md`

## Product Outcome
Help a household plan meals with one clear action available from both Recipes and Plan. Cooksmith fills only genuinely empty days, preserves work already done, and gives an explicit choice when the selected week is already complete.

The first release is deterministic and uses recipes visible to the active household. It reduces planning effort without silently replacing meals or requiring paid AI.

## Current Baseline
- Recipes provides the household's visible shared and private recipe collection.
- Plan supports household-local week navigation, linked recipes and editing/removing planned meals.
- CS-22 reconciles Shopping after authoritative planner mutations.
- The existing CS-38 package described a broad fortnight proposal but did not define where generation starts or how partially and fully planned weeks behave.
- Before implementation, verify latest remote `main`, the current Recipes and Plan route contracts, Jira dependencies, open Planner/Shopping work and current tests.

## Scope

### Included
- A visible **Plan my week** action in Recipes.
- A visible **Plan my week** action in Plan.
- Recipes targets the current household-local week.
- Plan targets the week currently visible in the planner.
- Fill empty meal days while preserving every occupied day.
- When the target week has no empty meal days, offer **Plan next week**, **Replace this week** and **Cancel**.
- Require a separate destructive confirmation before replacing a complete week.
- Review generated meals before applying them.
- Deterministic selection from recipes visible and permitted for the active household.
- Normal CS-22 Shopping reconciliation after confirmed planner changes.

### Explicitly Out of Scope
- Automatically replacing a partially planned week.
- Autonomous writes without review and confirmation.
- Medical advice, inferred allergies or a new household preference model.
- Pantry consumption, retailer ordering, nutrition optimisation or budget optimisation.
- Paid AI, a new provider or a new recurring cost.
- Replanning more than the selected week in one operation.

## Functional Requirements

### FR-1 — Two clear entry points
Both Recipes and Plan expose the same **Plan my week** capability.

**Acceptance criteria**
- [ ] Recipes displays a keyboard- and touch-accessible **Plan my week** action.
- [ ] Starting from Recipes targets the current household-local week.
- [ ] Plan displays a keyboard- and touch-accessible **Plan my week** action.
- [ ] Starting from Plan targets the week currently displayed, including a past or future week the user has deliberately navigated to.
- [ ] Both entry points open the same generation/review journey and use the same domain rules.
- [ ] Returning or cancelling preserves the originating route and leaves the planner unchanged.

### FR-2 — Fill only empty days
Generation supplements existing planning rather than undoing it.

**Acceptance criteria**
- [ ] An occupied planner day is never selected as a generation target.
- [ ] A partially planned week generates proposals only for empty meal days.
- [ ] Existing linked recipes and free-text meals remain unchanged.
- [ ] Deliberately empty states such as leftovers or eating out are treated as occupied and are preserved.
- [ ] If no permitted recipe can be proposed for an empty day, that day remains empty and the review explains why.
- [ ] Repeating the action before Apply creates no planner or Shopping mutation.

### FR-3 — Handle a fully planned week explicitly
A complete week requires a user choice rather than a silent no-op or overwrite.

**Acceptance criteria**
- [ ] When every target day is occupied, show: **This week is already planned. What would you like to do?**
- [ ] The available actions are **Plan next week**, **Replace this week** and **Cancel**.
- [ ] **Plan next week** targets the immediately following household-local week and fills only its empty days.
- [ ] If the following week is also complete, the same choice is shown for that week; the system does not skip repeatedly without the user's knowledge.
- [ ] **Replace this week** opens a separate confirmation that clearly states existing meals will be removed.
- [ ] Replacement does not occur until the user confirms the destructive action.
- [ ] **Cancel** closes the prompt without changing planner or Shopping data.
- [ ] Focus enters the prompt, remains trapped while open, returns to the triggering control on cancel, and destructive action copy is not communicated by colour alone.

### FR-4 — Review before apply
Generated meals remain a proposal until confirmed.

**Acceptance criteria**
- [ ] The review shows the target week and distinguishes preserved meals from proposed meals.
- [ ] Users can replace or remove an individual proposed meal before Apply.
- [ ] Existing meals in a partially planned week cannot be edited through the generation review; normal Plan editing remains available.
- [ ] For confirmed full-week replacement, the review clearly identifies every existing meal that will be replaced.
- [ ] Cancelling review leaves all planner and Shopping data unchanged.
- [ ] Apply is disabled while generation or persistence is busy and cannot be submitted twice.

### FR-5 — Deterministic, household-safe generation
The first release works without AI and cannot use another household's private data.

**Acceptance criteria**
- [ ] Candidate recipes are restricted to recipes visible and permitted for the authenticated user's active household.
- [ ] Private recipes belonging to another user or household never influence results.
- [ ] Safety requirements represented by existing authoritative data are hard constraints and are never relaxed.
- [ ] The deterministic selector avoids duplicate recipes within the generated week when enough candidates exist.
- [ ] Frozen inputs produce stable, testable output.
- [ ] When candidates are insufficient, the review explains the shortfall in plain language without inventing recipes.
- [ ] No paid provider, external AI call or new dependency is introduced.

### FR-6 — Reliable apply and Shopping reconciliation
Confirmed changes use current authoritative planner behaviour.

**Acceptance criteria**
- [ ] Apply writes only the reviewed target dates.
- [ ] A normal fill operation never deletes or overwrites occupied dates.
- [ ] A confirmed replacement removes the selected week's existing meals and writes the reviewed proposals as one recoverable operation.
- [ ] Failure does not present a false success and provides a clear retry or recovery path.
- [ ] CS-22 reconciliation reflects added, removed and replaced recipes without duplicate ingredient contributions.
- [ ] Retrying after an uncertain response is idempotent and does not duplicate planner meals or Shopping contributions.

## UX and Interaction Requirements
- Keep both entry points visible but secondary to the page's primary browsing/planning tasks.
- Use the existing Cooksmith dialog/sheet conventions and Australian/UK English.
- Design mobile first at 320px; review content must reflow without horizontal scrolling.
- Define loading, empty-recipe, insufficient-candidate, busy, success, error and recovery states.
- Preserve 44px targets, visible focus, semantic headings, contextual accessible names, zoom/reflow and reduced motion.
- Do not rely on colour, hover, gesture or an icon alone.

## Data and Domain Requirements
- Prefer existing planner, recipe-visibility and Shopping reconciliation contracts.
- Model target-week resolution, occupied-day detection and replacement intent as typed framework-independent domain logic.
- Derive authentication and active household authoritatively; never accept a forged household identifier from the client.
- Preserve RLS and least privilege.
- Use household-local calendar dates; avoid UTC date drift at week boundaries.
- Generation and Apply must be idempotent.
- No migration is expected. Any newly discovered schema requirement is a scope stop requiring a separate approved package amendment.

## Technical Direction
- Implement a single application use case shared by Recipes and Plan.
- Separate proposal generation from planner mutation.
- Reuse existing route, dialog, planner mutation and CS-22 reconciliation patterns.
- Use a deterministic ranker with injected/frozen time or seed where ordering needs a stable tie-break.
- Avoid broad Planner, Recipe or Shopping refactors.
- Do not add an AI abstraction, provider, feature flag or dependency for speculative later use.
- Record an ADR only if implementation reveals a genuinely new durable cross-domain contract.

## Implementation Guidance
1. Verify CS-20 and CS-22 are Done, merged and released on the latest remote `main`.
2. Inspect current Recipes and Plan entry points, planner date semantics, authoritative recipe visibility and CS-22 reconciliation.
3. Write decision-table unit tests for current/visible week selection, partial weeks, full weeks, next-week choice and confirmed replacement.
4. Implement the deterministic proposal use case and typed result states.
5. Add the shared review and complete-week choice UI to both routes.
6. Persist only on Apply through authoritative planner mutations.
7. Add regression coverage for Shopping additions/removals and idempotent retry.
8. Run all applicable AIEOS validation and validate the exact Vercel Preview with synthetic data.
9. Record evidence in the PR and Jira; stop before merge.

## Test Plan

### Unit tests
- Entry-point target-week resolution in the household timezone.
- Occupied-day classification, including linked meals, free text, leftovers and eating out.
- Partial-week empty-slot selection.
- Complete-week choice state and next-week targeting.
- Replacement confirmation requirement.
- Deterministic ranking, duplicate avoidance and insufficient-candidate output.
- Idempotency keys or equivalent retry contract.

### Component tests
- Both entry points have accessible names and open the shared flow.
- Dialog focus management, keyboard operation and destructive confirmation.
- Preserved/proposed meal labelling.
- Loading, empty, insufficient, busy, error and recovery states.
- Apply cannot double-submit.

### Integration tests
- Partial week preserves existing meals and writes only empty dates.
- Next week preserves any meals already present there.
- Cancel and pre-Apply review perform no writes.
- Confirmed replacement removes only the target week's meals.
- Cross-household and private recipe candidates are excluded.
- CS-22 Shopping reconciliation adds and removes the correct recipe contributions without duplication.
- Retry after an uncertain response is safe.

### End-to-end, accessibility and responsive tests
- Recipes → Plan my week → review → Apply.
- Plan on a partially filled week → fill gaps only.
- Plan on a full week → Plan next week.
- Plan on a full week → Replace this week → destructive confirmation → review → Apply.
- Cancel from each prompt/review state leaves the plan unchanged.
- Validate 320px mobile, larger mobile, tablet and desktop; keyboard flow; focus return; axe; no horizontal overflow.

## Hosted Preview Scenarios
- [ ] From Recipes, generate for the current week with some occupied days and confirm those days are preserved.
- [ ] From Plan, navigate to a future partially planned week, generate and Apply only to empty days.
- [ ] On a complete week, choose **Plan next week** and verify existing next-week meals are preserved.
- [ ] On a complete week, choose **Replace this week**, cancel the destructive confirmation and prove no changes occurred.
- [ ] Confirm replacement, Apply once and verify Planner plus Shopping additions/removals.
- [ ] Exercise insufficient candidates and a recoverable persistence failure.
- [ ] Verify mobile layout, keyboard focus and representative screen-reader announcements.

## Quality Gates
- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Applicable Playwright responsive/accessibility tests pass.
- [ ] Package readiness validation passes.
- [ ] No secrets, real household data or credentials are committed.
- [ ] Exact Vercel Preview is manually validated.
- [ ] Jira contains the package and PR evidence.

## Definition of Done
- [ ] All acceptance criteria and regression coverage pass.
- [ ] Existing Recipes, Plan and Shopping journeys remain intact.
- [ ] Household isolation and recipe visibility are verified.
- [ ] GitHub Actions and Vercel pass on the exact head SHA.
- [ ] Hosted mobile and accessibility evidence is recorded honestly.
- [ ] Migration and Edge Function impact are explicitly declared.
- [ ] Security, privacy, production and cost impact are recorded.
- [ ] PR is reviewed and merged by a human.
- [ ] Production application deployment is verified.
- [ ] Jira is Done and the package is moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Migrations in this package:** None expected.
- **Edge Functions in this package:** None expected.
- **Production effect before merge:** None; this package PR is documentation only.
- **Rollback:** Remove or disable both generation entry points; confirmed meals remain ordinary planner entries and CS-22 continues to reconcile them.
- **New dependency/provider:** None.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements
Implementation PR title: `[CS-38] M08E — Generate a Meal Plan from Recipes or Plan`

The implementation PR must include the Jira issue and package path, user effort removed, exact entry-point behaviour, partial/full-week decision table, tests, Preview evidence, migration and Edge Function declarations, security/privacy/accessibility impact, limitations, rollback and A$0 cost confirmation.
