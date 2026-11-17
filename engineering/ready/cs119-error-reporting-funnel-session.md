# Engineering Package CS-119: Report production errors, measure the first-run funnel and keep users signed in on a flaky launch

## Metadata

- **Jira issue:** `CS-119`
- **Jira link:** https://smillins.atlassian.net/browse/CS-119
- **Epic:** Observability & Monitoring (CS-58)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `feat/cs-119-error-reporting-funnel-session`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs119-error-reporting-funnel-session.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C10, S8, S10 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

The operator sees real failures and where new users drop off, and a person is not signed out because their connection dropped while the app was starting.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `AppErrorBoundary` logs to console only (`src/app/errors/AppErrorBoundary.tsx:23-33`); `createRoot` has no error hooks (`src/main.tsx:29`); only `RouteErrorPage.tsx:19` calls Sentry.
- PostHog is initialised by CS-57 with no custom events.
- 29 bare `catch {}` blocks and 5 logger warn or error calls in `src`.
- `bootstrapAuth` signs out locally on any `getUser` error (`src/application/auth/bootstrapAuth.ts:64-69`).
- Load errors without retry (`src/routes/PlanPage.tsx:174`, `src/routes/ShoppingPage.tsx:113`); silent flag fallback (`src/app/admin/FeatureFlagProvider.tsx:23-24`).

## Scope

### Included

- React 19 root error hooks and boundary reporting to Sentry.
- One `reportError` helper used by every catch.
- Five funnel events.
- Resilient session restore.
- Retry on page-load errors for Home, Plan, Shopping, Recipes, Pantry and Get Ahead.

### Explicitly Out of Scope

- Session replay, user identification, new providers or tiers.
- Edge Function logging changes.
- Offline shopping (CS-115).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Render errors caught by the app boundary and React root are reported to Sentry with existing scrubbing.
- [ ] Every caught failure in routes and repositories is reported through one helper or carries a recorded reason for being ignored.
- [ ] Five funnel events are captured with no personal data: signed up, onboarding complete, first recipe saved, first dinner planned, first item ticked.
- [ ] A network or server error during session validation keeps the cached session; only an explicit invalid-session response signs the user out.
- [ ] Every page-load error offers a retry action.
- [ ] No session replay, identification or paid tier is introduced.

## Technical Direction

- Use `Sentry.reactErrorHandler` for `onCaughtError`, `onUncaughtError` and `onRecoverableError`.
- Classify auth errors by status: 401 and 403 invalidate; network and 5xx do not.
- Events fire once per household or user using a server-known fact where possible, not local storage alone.
- Keep the CS-57 activation rule: preview and production only.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: error classification, scrubbing of event payloads.
- Integration: `auth-bootstrap` with network failure; boundary reporting with a stub.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0 within current Sentry and PostHog free tiers; confirm event volume stays inside them.

## Deferred Work and Open Questions

- Confirm the five event names and that household id is acceptable as an anonymous grouping key.

## Pull Request

Title: `CS-119: Report production errors, measure the first-run funnel and keep users signed in on a flaky launch`
