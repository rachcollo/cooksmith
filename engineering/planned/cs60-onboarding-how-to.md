# Engineering Package — CS-60: Teach Key Cooksmith Features During Onboarding

## Metadata
- **Milestone:** M12C
- **Jira issue:** CS-60
- **Epic:** Beta Launch (CS-8)
- **Status:** Planned
- **Branch:** `feat/cs-60-onboarding-how-to`
- **Depends on:** Stable MVP navigation and approved onboarding product decisions
- **Blocks:** None
- **Package path:** `engineering/planned/cs60-onboarding-how-to.md`

## Product Outcome
Teach new users the small number of Cooksmith workflows they need to get value quickly, so working screens can remain calm and uncluttered. Guidance should be short, visual, optional and available again later.

This is intentionally a planned package. The user has approved the direction, but the interaction model and first-release content need a product decision before it can become Ready.

## Current Baseline
- Household onboarding establishes an authenticated household but does not provide a reusable product tour/how-to experience.
- Feature screens currently carry some repeated explanatory copy because there is no dedicated education surface.
- CS-59 removes recurring instructions from Plan my week and establishes onboarding/help as the future home for that education.
- Verify the latest navigation, onboarding, Settings/Help surfaces and completed MVP workflows before promoting this package.

## Scope

### Included
- A short mobile-first introduction to Recipes, Plan, Shopping and Pantry.
- A **Plan my week** lesson covering preservation of existing meals, empty-day filling, proposal editing/reordering and Apply.
- Skip/continue controls that never block product access.
- A persistent way to reopen the guidance later from an approved Help or Settings entry point.
- Per-user completion/replay behaviour once the storage decision is approved.
- Accessible text/visual alternatives and reduced-motion behaviour.

### Explicitly Out of Scope
- Persistent instructional paragraphs on everyday feature screens.
- Support chat, video hosting, product analytics or a paid onboarding platform.
- Blocking existing users until they complete a tour.
- Auto-performing product mutations as part of instruction.
- Rebuilding account or household onboarding.
- Final implementation before the open product decisions below are approved.

## Product Decisions Required Before Ready
- First-login walkthrough, standalone how-to screen, contextual lessons, or a deliberately scoped combination.
- Exact workflows and number of steps in the first release.
- Final Help/Settings replay entry point.
- Per-user persistence model and reset/replay semantics.
- Static illustration, screenshot, lightweight animation or live interactive demonstration.
- Behaviour for existing users when the feature first launches.
- Whether content is versioned so materially new guidance can be shown once without nagging.

## Functional Requirements

### FR-1 — Teach once, keep daily screens calm
**Acceptance criteria**
- [ ] Guidance explains the selected core workflows without requiring permanent explanatory copy on working screens.
- [ ] **Plan my week** guidance states that occupied days are preserved, empty days are proposed, individual proposals can be changed and Apply confirms planner changes.
- [ ] Each step uses concise plain language and one primary idea.
- [ ] Guidance does not imply unsupported automation or guarantee a perfect meal plan.
- [ ] Product screens remain usable if the user never completes the guidance.

### FR-2 — Optional and replayable
**Acceptance criteria**
- [ ] A user can skip or close the guidance at any point.
- [ ] Skipping routes directly to a useful Cooksmith screen without a guilt message or repeated blocking prompt.
- [ ] Completed or skipped guidance can be reopened later from the approved Help/Settings entry point.
- [ ] Replay does not erase household data or change onboarding completion.
- [ ] Completion persistence is per user, not inferred from household content.

### FR-3 — Safe instructional content
**Acceptance criteria**
- [ ] Demonstrations do not create, replace or delete real planner, recipe, Shopping or Pantry data without an explicit normal product confirmation.
- [ ] Screenshots or fixtures contain synthetic household and recipe data.
- [ ] No real identities, household content, credentials or provider payloads are embedded.
- [ ] Guidance remains correct when a user has an empty household or no recipes.
- [ ] Links and controls never lead to dead or unavailable actions.

### FR-4 — Accessible, mobile-first learning
**Acceptance criteria**
- [ ] The experience works at 320px without horizontal scrolling.
- [ ] Every control has an accessible name and at least a 44px target.
- [ ] Reading and focus order match the visual sequence.
- [ ] Keyboard and screen-reader users can navigate, skip, continue and replay.
- [ ] Motion is optional, respects reduced-motion preferences and has an equivalent static explanation.
- [ ] Guidance does not rely on colour, hover, gesture, animation or an image alone.

## UX and Interaction Requirements
- Prefer 3–5 short steps over a long carousel or dense page.
- Show progress without creating pressure.
- Keep Skip available and make Continue/Finish clear.
- Avoid auto-advancing content.
- Preserve back navigation and return users to a predictable screen.
- Use Australian/UK English and Cooksmith's calm tone.

## Data and Domain Requirements
- Do not choose a persistence design until the product decisions are approved.
- If persistence is required, keep it user-scoped and additive; household membership must not grant access to another user's onboarding state.
- Do not store unnecessary interaction analytics.
- Any migration must follow additive schema, RLS, generated-type and protected-release standards.

## Technical Direction
- Reuse current route/dialog/sheet primitives after the interaction model is approved.
- Prefer local/static instructional assets and existing dependencies.
- Keep content configuration typed and separated from navigation/persistence orchestration.
- Do not add a tour framework or analytics provider without a separate dependency/cost review.
- Record an ADR only if a durable cross-application onboarding state contract is introduced.

## Implementation Guidance
1. Resolve and record every Product Decision Required Before Ready.
2. Update this package to `Ready`, remove all open-decision language, set the final dependency/data/release impact and merge a reviewed amendment.
3. Verify current `main`, navigation, onboarding and Help/Settings entry points.
4. Implement the smallest approved education surface with synthetic content.
5. Add unit, component, persistence/RLS where applicable, E2E, responsive and accessibility coverage.
6. Run the full AIEOS quality suite and exact Preview validation.
7. Record evidence in Jira and the implementation PR; stop before merge.

## Test Plan

### Unit and component tests
- Step order and content are complete and valid.
- Skip, continue, back and finish states.
- Focus management and accessible progress.
- Reduced-motion fallback.
- Empty/no-recipe variations.

### Integration tests
- Completion/skip/replay persistence after the storage model is approved.
- User isolation for saved onboarding state.
- Replay leaves household onboarding and product data unchanged.
- Navigation returns to the correct product screen.

### End-to-end, accessibility and responsive tests
- First eligible user opens, skips and enters Cooksmith.
- Another user completes every step and later replays from Help/Settings.
- 320px, larger mobile, tablet and desktop reflow.
- Keyboard-only and representative screen-reader journey.
- Axe and reduced-motion checks.
- No real product data mutation during instruction.

## Hosted Preview Scenarios
- [ ] New user can skip immediately and use Cooksmith.
- [ ] New user can complete the approved short guidance.
- [ ] **Plan my week** guidance is accurate but concise.
- [ ] Existing user can replay from the approved location.
- [ ] Replay changes no household data.
- [ ] Mobile, keyboard, screen-reader, reduced-motion and no-overflow checks pass.

## Quality Gates
- [ ] Product decisions are resolved before status changes to Ready.
- [ ] Package readiness validation passes only after promotion to Ready.
- [ ] Full repository validation defined by the AIEOS passes during implementation.
- [ ] Applicable migration/RLS checks pass if persistence is introduced.
- [ ] No secrets, credentials or real household data are committed.
- [ ] Exact hosted Preview is manually validated.
- [ ] Jira contains PR and delivery evidence.

## Definition of Done
- [ ] Approved onboarding/how-to experience is optional, concise and replayable.
- [ ] Daily feature screens do not regain repeated explainer copy.
- [ ] Automated and hosted validation pass.
- [ ] Accessibility and user-isolation evidence is recorded.
- [ ] Migration, provider, production and cost impact are explicit.
- [ ] PR is reviewed, merged, deployed and verified.
- [ ] Jira is Done and the package is moved to `engineering/completed/`.

## Release, Rollback and Cost
- **Expected migration:** Product decision pending; none if completion remains local, additive user-scoped migration if persisted.
- **Expected Edge Function:** None.
- **Rollback:** Remove the guidance entry/trigger while preserving normal product access; forward-fix persisted state if introduced.
- **New dependency/provider:** None expected.
- **Recurring cost:** A$0/month and A$0/year.

## PR Requirements
Future implementation PR title: `[CS-60] M12C — Teach Key Cooksmith Features During Onboarding`

Include approved interaction decisions, final content map, screenshots/recording, persistence and RLS impact, accessibility evidence, Preview result, migration/Edge declarations, rollback and cost.
