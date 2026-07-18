# Engineering Package — CS-29: Cook With Me Step-by-Step Mode

**Status:** Future / Backlog  
**Branch:** `cs29-cook-with-me`  
**Base branch:** Latest `main` when scheduled  
**Release requirement:** Not required for first release  
**Depends on:** CS-27 and CS-28; reliable ordered instructions

---

## 1. Objective

Provide a calm, hands-busy cooking mode that guides a user through one instruction at a time. This package is intentionally deferred until multiline authoring and ordered backend derivation are proven in production.

## 2. User Outcome

From a recipe, a user can start Cook With Me and:

- see one clear step at a time;
- move forward and backward without losing their place;
- see progress through the recipe;
- resume an interrupted session on the same device;
- quickly refer to ingredients without abandoning the current step;
- finish or exit deliberately.

## 3. Scope

### 3.1 Entry and session

- Expose one clear secondary “Cook with me” action on recipes with derived steps.
- Start at step one unless resumable progress exists.
- Let the user resume or restart deliberately.
- Store only the minimum progress needed, household/user scoped according to the final product decision.
- An edited recipe must not silently resume against incompatible step content; use recipe revision/version information or safely restart.

### 3.2 Step experience

- Present the current step prominently with current/total progress.
- Provide large Previous and Next controls.
- Support keyboard activation and predictable focus.
- Provide an accessible step list or jump control without cluttering the primary mode.
- Let users reveal ingredients in a lightweight drawer/panel and return to the same step.
- Preserve authored text and safe plain-text rendering.
- Show a clear completion state and route back to recipe detail.

### 3.3 Reliability

- Navigation must work without a network round trip after the recipe is loaded.
- Refresh/reopen may restore progress through a documented persistence strategy.
- Archived or deleted recipes must fail safely.
- Recipe changes during a session must have deterministic behaviour.
- Avoid duplicate progress records and stale cross-household state.

## 4. Accessibility and Mobile Requirements

- Optimise for phone and tablet use in a kitchen.
- Use large touch targets, strong readable contrast, and scalable text.
- Do not rely on gestures, colour, or animation alone.
- Support keyboard-only use and screen readers with meaningful step/progress announcements.
- Avoid stealing focus on routine step changes.
- Respect reduced-motion preferences.
- Screen Wake Lock may be offered as progressive enhancement only, with clear state and graceful fallback.
- Voice control, speech recognition, and text-to-speech are separate product decisions and are not required here.

## 5. Out of Scope

- voice assistant or conversational AI;
- automatic timers, unless separately scoped;
- ingredient scaling;
- Pantry deduction or shopping-list updates;
- collaborative live cooking;
- background audio;
- recipe authoring or URL import;
- nutrition calculations.

## 6. Technical Requirements

- Consume ordered instruction records from CS-28; do not implement a second parser.
- Keep a stable recipe revision identifier for progress compatibility.
- Follow existing routing, provider, telemetry, and household-isolation patterns.
- Keep the core stepper client-side once loaded.
- Do not require a service worker or offline platform rewrite.
- Treat recipe content as untrusted plain text.
- Define telemetry minimally: mode started, step advanced/back, completed, exited; exclude private recipe text.

## 7. Testing Requirements

- start, next, previous, jump, completion, exit, restart, and resume;
- one-step and long recipes;
- edited, archived, unavailable, and deleted recipes;
- stale progress and household switching;
- refresh and offline-after-load behaviour;
- keyboard, screen reader semantics, reduced motion, zoom, and mobile viewport;
- Wake Lock support, denial, release, and unavailable fallback if implemented;
- regressions to normal recipe detail/edit flows.

## 8. Acceptance Criteria

CS-29 is complete when:

- a recipe with ordered instructions can launch a focused step mode;
- users can navigate, review ingredients, exit, and resume predictably;
- revision changes and unavailable recipes are handled safely;
- the core mode works after initial load without continuous network access;
- mobile and accessibility requirements are met;
- no voice/AI dependency is introduced;
- automated checks, CI, and hosted-preview testing pass;
- completion and handover documentation are committed.

## 9. Deliverables

- Cook With Me entry action and route/dialog;
- accessible stepper and ingredient reference;
- progress/revision persistence contract;
- focused unit, integration, accessibility, and household-isolation tests;
- telemetry/privacy notes, completion report, and handover.

## 10. Scheduling Boundary

Keep CS-29 in Backlog until CS-27 and CS-28 are delivered and first-release work, including CS-30, is secure. Product discovery should validate kitchen use before adding timers, voice, or other automation.
