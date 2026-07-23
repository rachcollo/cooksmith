# Engineering Package — CS-69: Smart Prep Checklist

## Metadata

- **Milestone:** Get Ahead
- **Title:** Smart Prep Checklist
- **Jira issue:** [CS-69](https://smillins.atlassian.net/browse/CS-69)
- **Epic:** Get Ahead
- **Status:** `Ready`
- **Branch:** `feat/cs-69-smart-prep-checklist`
- **Depends on:** CS-66, CS-67
- **Blocks:** None
- **Package path:** `engineering/ready/cs69-smart-prep-checklist.md`

## Product Outcome

Give users a calm working view for a Get Ahead session: what to do now, how long each task should take, what benefit it creates and where they can resume after an interruption.

## Current Baseline

- CS-66 owns navigation, duration choice, session persistence, basic task completion and resume/end-early behaviour.
- CS-67 owns versioned ranking, remaining-time selection, explanations and user overrides. CS-68 may provide consolidated multi-meal tasks but is not required for this story.
- The application has accessible buttons, dialogs, sheets, feedback states and responsive layout primitives, but no dedicated working checklist pattern.
- Verify accepted session/task states and save-conflict behaviour before implementing the checklist.

## Approved Product Decisions

- The checklist is the primary in-session screen after recommendations are generated.
- Task states are `remaining`, `completed`, `skipped` and `deferred`. Skipped removes the task from the current session recommendation; deferred keeps it eligible for a later session.
- State changes save immediately and optimistically only when rollback is reliable. A failed save restores the prior visible state and offers retry.
- Completed tasks remain visible in a collapsed completed section so progress is trustworthy and reversible.
- Remaining recommendations recalculate after complete, reopen, skip, defer or available-time change. The task the user is currently acting on must not jump away before confirmation.
- Overall progress is based on completed recommended preparation minutes, with a clear task-count fallback for zero/unknown duration. Weekly time saved includes completed tasks only; remaining potential is labelled separately.

## Scope

### Included

- A mobile-first interactive checklist over the current CS-66/CS-67 session.
- Duration and downstream-time-saved estimates per task.
- Complete, reopen, skip and defer actions with automatic persistence.
- Resume of an interrupted session at its last durable state.
- Recalculation after task-state or available-time changes.
- Overall progress, completed time saved and remaining potential.
- Loading, offline/save-conflict, stale-source, completed and no-remaining-work states.

### Explicitly Out of Scope

- Opportunity detection, scoring formula or consolidation rules owned by CS-65, CS-67 and CS-68.
- Timers, alarms, notifications, voice control, hands-free cooking or Guided Cooking.
- Automatic recipe, planner, pantry or shopping mutation.
- Social sharing, household task assignment or multi-user live presence.

## Functional Requirements

### FR-1 — Present the prioritised checklist

**Acceptance criteria**

- [ ] Remaining tasks appear in the current CS-67 order and show an action label, estimated duration, estimated later time saved and source meal context.
- [ ] Consolidated CS-68 tasks, when present, show the supported-meal count and retain their disclosure behaviour.
- [ ] Completed tasks move to a collapsed completed section without disappearing from session history.
- [ ] Unknown estimates are labelled honestly and do not render misleading zero values.
- [ ] A stale or no-longer-eligible task is clearly unavailable and cannot be completed.

### FR-2 — Complete and reopen tasks

**Acceptance criteria**

- [ ] A user can complete and reopen a task by touch or keyboard.
- [ ] Each state change saves automatically, idempotently and survives refresh/re-entry.
- [ ] Optimistic failure restores the prior state, announces the failure and provides retry.
- [ ] Completion/reopen of a CS-68 consolidated task respects its atomic linked-task contract.
- [ ] Repeated or concurrent requests resolve to one legal durable state without double-counting progress.

### FR-3 — Skip or defer tasks

**Acceptance criteria**

- [ ] Skip and defer are available through a compact secondary action, not competing primary buttons on every row.
- [ ] Skipping removes the task from the current recommendation and recalculates remaining work.
- [ ] Deferring removes the task from the current session while preserving it as eligible for a future session.
- [ ] A user can undo the most recent skip/defer and can inspect skipped/deferred tasks through progressive disclosure.
- [ ] Neither action bypasses source, safety or authorisation constraints.

### FR-4 — Resume interrupted work

**Acceptance criteria**

- [ ] Returning to Get Ahead resumes the latest unfinished household session at its last durable task state.
- [ ] The page clearly distinguishes resumed work from a newly generated session without adding a blocking confirmation.
- [ ] Focus is restored to a sensible session heading or next remaining task, not an obsolete control.
- [ ] Offline or pending state is visibly distinguished from confirmed saved progress.

### FR-5 — Recalculate the remaining session

**Acceptance criteria**

- [ ] Complete, reopen, skip, defer and duration changes invoke the CS-67 remaining recommendation contract.
- [ ] Completed work never returns to the remaining list and is not lost when time decreases.
- [ ] The currently actioned row remains stable until feedback is announced; subsequent reordering does not steal focus.
- [ ] Increasing or decreasing remaining time uses the CS-66 validation rules and shows the updated recommendation and totals.
- [ ] A no-fit result offers a clear duration change or session-end action.

### FR-6 — Show trustworthy progress and benefit

**Acceptance criteria**

- [ ] Overall progress uses completed recommended preparation minutes divided by total recommended minutes when all required estimates are valid.
- [ ] When duration data is zero/unknown, progress falls back to completed tasks divided by actionable tasks and is labelled accordingly.
- [ ] Completed estimated weekly time saved counts completed tasks only and never double-counts consolidated sources.
- [ ] Remaining potential is displayed separately and updates after recalculation.
- [ ] Progress is conveyed as text and semantic progress state, not colour alone.

## UX and Interaction Requirements

- Keep the working screen compact: session time/progress summary, next tasks, then collapsed completed/deferred sections.
- Task rows should support one obvious completion action; secondary actions live in an accessible menu or disclosure.
- Avoid blocking success dialogs and unnecessary confirmation. Confirm only destructive replacement/end actions.
- Keep rows stable during save/re-ranking, use restrained motion and honour reduced-motion settings.
- Provide explicit initial loading, recalculating, offline, save-failed, stale-task, no-fit and session-complete states.

## Data and Domain Requirements

- Use explicit validated task-state transitions with timestamps and actor where existing audit conventions support it.
- Preserve the CS-66 session snapshot and CS-67 score/override history; checklist state extends rather than rewrites those contracts.
- Define defer eligibility for a future session without creating duplicate tasks from the same source opportunity/version.
- Derive progress and benefit totals from canonical task/source allocations so CS-68 consolidated work is counted once.
- Keep all durable state household-scoped with additive migrations and RLS where schema changes are required.

## Technical Direction

- Build the checklist as a focused route component over existing session application services; keep totals and transition rules in pure domain functions.
- Use mutation state keyed per task to prevent duplicate submissions while preserving independent task interaction.
- Reuse current menu/dialog/sheet/feedback primitives and navigation route announcement.
- Prefer server-confirmed ordering revisions or optimistic concurrency to avoid two household members silently overwriting newer state.
- Add no provider, dependency, Edge Function, timer or background process.

## Security and Privacy

- Every task mutation validates active membership, session ownership, source linkage and legal transition.
- Concurrent/stale writes fail safely and do not reveal another household’s session or task details.
- Household switching clears checklist, progress, pending mutations and error state before loading the next household.
- Preserve and extend CS-66 RLS denial tests.

## Accessibility

- Use native checkbox semantics where they accurately represent complete/reopen; expose skip/defer as named buttons/menu items.
- Progress has an accessible name/value and equivalent text.
- Save/recalculation feedback uses polite live regions without duplicate announcements.
- Reordering never traps or loses keyboard focus; menus restore focus to their trigger.
- Validate 320/375-pixel layouts, 200% text zoom, keyboard-only operation, screen-reader names and reduced motion.

## Test Plan

### Unit and component

- Legal/illegal task transitions, duration-based and task-count progress, completed versus potential benefit and consolidated deduplication.
- Optimistic success/failure/rollback, concurrent pending tasks, stable focus during rerank and resume focus.
- Secondary menu, undo, collapsed sections, stale/no-fit/offline/completed states and accessible progress.

### Integration, database and RLS

- Complete/reopen/skip/defer persistence, idempotency, refresh resume and future-session defer eligibility.
- CS-67 recalculation after every relevant transition and CS-68 atomic behaviour when consolidation exists.
- Concurrent/stale write handling and owner/member versus inactive, unrelated, unauthenticated and forged access.
- Migration reset, database lint, pgTAP and generated-type freshness if persistence changes.

### End-to-end and hosted preview

- Start a session on mobile, complete, skip and defer tasks, refresh and resume at the durable state.
- Change remaining time and confirm re-ranking, totals, row stability and completed history.
- Simulate save failure/offline recovery, stale source and session completion.
- Validate mobile/desktop, keyboard, menus, axe, text zoom and reduced motion on the exact Preview.

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
- [ ] Database/RLS/generated-type checks pass if persistence changes.
- [ ] Package readiness validation passes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Hosted Preview evidence is recorded honestly.

## Definition of Done

- [ ] Checklist, transitions, resume, recalculation and progress satisfy all acceptance criteria.
- [ ] State changes are accessible, durable, idempotent and safe under failure/concurrency.
- [ ] Progress and time-saved totals are honest and do not double-count.
- [ ] Automated, Preview, Jira, migration and handover evidence is complete.

## Release, Rollback and Cost

- **Expected migration impact:** Possibly additive skip/defer state, timestamps or concurrency revision extending the CS-66 session model.
- **Expected Edge Function impact:** None.
- **Production deployment:** If database changes are required, use the protected Production database workflow after merge.
- **Rollback:** Fall back to the CS-66 basic completion/resume view and hide skip/defer/progress enhancements while preserving durable task history.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## PR Requirements

PR title: `CS-69: Smart prep checklist`

Include Jira/package links, dependency verification, state-transition and progress formulas, recalculation/resume evidence, concurrent/save-failure handling, migration and Edge Function declarations, RLS evidence, automated checks, Preview URL, accessibility evidence, rollback and A$0 cost impact.
