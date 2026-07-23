# Engineering Package — CS-66: Get Ahead Session

## Metadata

- **Milestone:** Get Ahead
- **Title:** Get Ahead Session
- **Jira issue:** [CS-66](https://smillins.atlassian.net/browse/CS-66)
- **Epic:** Get Ahead
- **Status:** `Ready`
- **Branch:** `feat/cs-66-get-ahead-session`
- **Depends on:** CS-65
- **Blocks:** CS-67, CS-68, CS-69
- **Package path:** `engineering/ready/cs66-get-ahead-session.md`

## Product Outcome

Let a household turn a chosen amount of available time into a calm, useful preparation session for its planned meals. Cooksmith should do the organising: the user chooses how long they have, receives work that fits, and can stop without losing progress.

This is the first user-facing Get Ahead flow. It consumes explainable opportunities from CS-65 but does not invent preparation or food-safety advice.

## Current Baseline

- The authenticated application shell has desktop and mobile primary navigation, route announcements, household context and reusable loading, empty, error, panel, dialog and form components.
- Meal plans and structured household recipes are available through typed repositories. CS-65 owns the deterministic, source-linked preparation-opportunity contract.
- There is no Get Ahead route, session lifecycle, duration-fitting service, preparation checklist or durable preparation state on `main`.
- Confirm the current navigation capacity at 320 CSS pixels, the accepted CS-65 output contract, active-household switching behaviour and latest RLS conventions before implementation.

## Approved Product Decisions

- Get Ahead is a first-class main-navigation destination on mobile and desktop.
- Preset durations are 15, 30 and 45 minutes and 1 and 2 hours. Custom duration is whole minutes within an explicitly validated sensible range.
- A session is household-scoped and plan-scoped. It uses the current selected plan and the exact opportunity/rule versions captured when the session is generated.
- Recommendations must fit within the selected time without assuming tasks can be partly completed. Unused minutes are acceptable and explained briefly.
- Starting the same unfinished session again resumes it. A user may explicitly start fresh; Cooksmith never silently discards progress.
- Ending early preserves task state and recalculates the useful remaining work for the time still available.

## Scope

### Included

- A protected Get Ahead route and main-navigation entry.
- Duration selection using the approved presets and a custom duration.
- Household-authorised loading of the current plan and CS-65 opportunities.
- A deterministic session plan whose included tasks fit the selected duration.
- A minimal interactive checklist sufficient to complete or reopen tasks; CS-69 owns the richer checklist experience.
- Automatic durable progress, resume and explicit end-early behaviour.
- Household-scoped persistence, RLS, generated types and tests required by the approved lifecycle.

### Explicitly Out of Scope

- The final multi-factor ranking model and user overrides owned by CS-67.
- Cross-recipe task consolidation owned by CS-68.
- Skip/defer controls, advanced progress presentation and polished checklist orchestration owned by CS-69.
- AI/LLM inference, external food knowledge, reminders, background jobs, notifications or calendar scheduling.
- Automatic recipe, meal-plan, pantry or shopping-list mutation.

## Functional Requirements

### FR-1 — Choose available time

**Acceptance criteria**

- [ ] Get Ahead is reachable from the authenticated mobile and desktop main navigation and has an announced document/route title.
- [ ] The page asks “How much time do you have today?” and offers 15, 30 and 45 minutes and 1 and 2 hours.
- [ ] A user can enter a valid custom whole-minute duration with accessible inline validation.
- [ ] Duration controls work by touch and keyboard without horizontal overflow at 320 CSS pixels.

### FR-2 — Generate a session from the current plan

**Acceptance criteria**

- [ ] The authorised active household and current selected plan are resolved server-side; a client-supplied household identifier is not authorisation evidence.
- [ ] Every eligible CS-65 opportunity in the selected plan is considered once.
- [ ] Every session task retains its source opportunity, recipe, planned-meal and rule/revision references.
- [ ] Included task estimates fit within the selected duration and the total estimate never exceeds it.
- [ ] An empty plan or a plan with no safe supported opportunities produces a helpful empty state without fabricating work.
- [ ] Loading and recoverable analysis failures do not create a partial or duplicate session.

### FR-3 — Estimate effort and downstream benefit

**Acceptance criteria**

- [ ] Each task has an explainable estimated preparation duration and estimated later time saved.
- [ ] Session totals are derived from included tasks and use one documented rounding rule.
- [ ] Estimates are labelled as estimates and never presented as food-safety guarantees.
- [ ] Until CS-67 is implemented, ordering and fitting use a simple, deterministic rule documented in code and do not masquerade as intelligent prioritisation.

### FR-4 — Persist, resume and end early

**Acceptance criteria**

- [ ] Starting a session persists its household, plan, selected duration, opportunity/rule versions and task snapshot.
- [ ] Completing or reopening a task saves automatically and idempotently.
- [ ] Refreshing or returning to Get Ahead resumes the latest unfinished session for that household without losing state.
- [ ] Switching household clears the prior household’s session from the UI before loading the next household.
- [ ] Ending early preserves completed work and recalculates the remaining recommendation against the remaining available time.
- [ ] Starting fresh requires an explicit action and confirmation when unfinished progress would be replaced.

### FR-5 — Preserve trusted source state

**Acceptance criteria**

- [ ] Session actions do not mutate recipes, meal-plan slots, pantry items or shopping items.
- [ ] If a source recipe or plan changes after session creation, the saved task remains auditable and the UI identifies stale work rather than silently rewriting history.
- [ ] A stale, removed or no-longer-authorised source cannot be actioned as though it were current.

## UX and Interaction Requirements

- Keep the entry screen focused on the time choice; do not front-load methodology or repeat explanatory copy.
- Move directly from a valid time choice to the generated session with one clear primary action.
- Use compact task rows with native checkbox semantics, duration, time-saved estimate and source meal context.
- Provide explicit loading, no-plan, no-opportunity, stale-session, offline/save-failure, completed and end-early states.
- Announce session creation, save failures and progress changes without moving focus unexpectedly.

## Data and Domain Requirements

- Prefer a household-owned session record plus immutable task snapshots and explicit task-state records; final table naming follows repository conventions.
- Store duration in integer minutes, task ordering, source opportunity/rule version, recipe/planned-meal references, estimate inputs and session status.
- Use constrained lifecycle values and audit timestamps. Repeated save requests must be idempotent.
- Apply additive migrations, RLS, least privilege and generated-type refresh. Active household members may access only their household’s sessions.
- Decide and document whether one active session is allowed per household/plan; enforce the decision transactionally rather than only in the client.

## Technical Direction

- Keep duration validation, fitting, totals and lifecycle transitions in pure typed domain functions.
- Add an application boundary that authorises the household, loads the selected plan and CS-65 opportunities, then performs one transactional create/resume operation.
- Reuse the current router, providers, navigation primitives and Supabase repository conventions.
- Do not introduce a provider, dependency, Edge Function, scheduler or background process.
- Design task snapshots so CS-67 can add ranking evidence and CS-68 can add multi-source tasks without destructive migration.

## Security and Privacy

- Cover owner/member success plus inactive, unrelated, unauthenticated and forged-household denial through real RLS.
- Do not expose another household’s recipe titles, task text, plan dates or progress in errors, caches or stale client state.
- Treat all duration and task-state inputs as untrusted; validate ownership and legal state transitions at the authoritative boundary.

## Accessibility

- Navigation and primary session actions are keyboard operable with visible focus.
- Duration choices expose selected state programmatically.
- Checklist state is conveyed beyond colour, and estimates/source meals have accessible names.
- Status updates use restrained live-region announcements; focus is placed predictably after generation and confirmation dialogs.
- Validate 320/375-pixel layouts, text zoom and reduced-motion behaviour.

## Test Plan

### Unit and component

- Preset/custom duration validation, exact-fit/under-fill fitting, totals and deterministic fallback ordering.
- Session lifecycle transitions, end-early recalculation, stale-source handling and idempotent task updates.
- Navigation, duration selection, loading/empty/error states, focus and accessible names.

### Integration, database and RLS

- Authorised plan analysis includes every CS-65 opportunity once and stores stable source snapshots.
- Create/resume/start-fresh concurrency, refresh persistence, task reopen and end-early behaviour.
- Owner/member access and inactive, unrelated, unauthenticated and forged-identifier denial using real policies.
- Household switching, generated-type freshness, migration reset, database lint and pgTAP.

### End-to-end and hosted preview

- From mobile navigation, choose every preset and a custom duration, start a session, complete a task, refresh and resume.
- End a session early, confirm completed work remains and the remaining plan fits.
- Exercise no-plan, no-opportunity, stale-source and save-failure recovery paths.
- Validate keyboard use, axe, text zoom and 320/375-pixel and desktop layouts on the exact Preview.

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
- [ ] Applicable Playwright, responsive and axe suites pass.
- [ ] Database reset, lint, pgTAP, RLS and generated-type freshness pass.
- [ ] Package readiness validation passes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Hosted Preview evidence is recorded honestly.

## Definition of Done

- [ ] All acceptance criteria are met with CS-65 as the only preparation-opportunity authority.
- [ ] Progress survives refresh, interruption and household switching without cross-household leakage.
- [ ] Automated coverage protects the primary journey, recovery paths and RLS.
- [ ] Preview evidence, migration declaration, handover and Jira/PR links are complete.

## Release, Rollback and Cost

- **Expected migration impact:** Yes — additive household-scoped session and task-state persistence with RLS.
- **Expected Edge Function impact:** None.
- **Production deployment:** Release migrations only through the protected Production database workflow after merge, using the approved `main` SHA and dry-run/history verification.
- **Rollback:** Disable the Get Ahead route/navigation and session writes; preserve additive session data and forward-fix released migrations.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `CS-66: Get Ahead session`

Include Jira/package links, dependency verification, duration/fitting rules, session lifecycle evidence, stale-source behaviour, migration and Edge Function declarations, RLS evidence, automated checks, Preview URL, mobile/accessibility evidence, limitations, rollback and A$0 cost impact.
