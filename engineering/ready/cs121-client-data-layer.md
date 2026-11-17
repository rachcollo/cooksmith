# Engineering Package CS-121: Share loaded data between screens and remove unsafe repository fallbacks

## Metadata

- **Jira issue:** `CS-121`
- **Jira link:** https://smillins.atlassian.net/browse/CS-121
- **Epic:** Infrastructure & Release (CS-7)
- **Priority:** Medium
- **Status:** `Planned`
- **Branch:** `refactor/cs-121-client-data-layer`
- **Depends on:** CS-114, CS-115
- **Blocks:** None
- **Package path:** `engineering/ready/cs121-client-data-layer.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C5, C8, C9, S11 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Publication Hold

This package is published for planning only. Its acceptance criteria remain proposed, not approved for implementation. Do not start a build or add `codex-ready` until the unresolved decisions below are confirmed by the product owner and the package status is explicitly changed to `Ready`.

Unresolved decisions blocking implementation:

- Approve adding `@tanstack/react-query` as a production dependency.

## Product Outcome

Screens open without reloading everything, and each action has one code path the maintainer can reason about. No user-visible behaviour changes.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Providers inject repositories only (`src/app/providers/AppProviders.tsx:90-142`); each route refetches on mount; Recipes polls every 30 seconds (`src/routes/RecipesPage.tsx:206-208`).
- `PlanPage.tsx` 1,081 lines with 23 state hooks; `AdminPage`, `RecipesPage`, `ShoppingPage` 930 to 1,000 lines.
- 60 cast escapes in `src/infrastructure`; `as never` on typed RPCs (`supabaseShoppingRepository.ts:402, 431, 455, 466, 473`); unvalidated snapshot (`:127-144`).
- Optional repository methods (`src/routes/ShoppingPage.tsx:92-97, 356-381`; `src/routes/PlanPage.tsx:445`).
- Legacy schema fallbacks (`src/infrastructure/meal-plans/supabasePlannedMealRepository.ts:90-102, 194-221, 242-328`).

## Scope

### Included

- A per-household query cache shared by routes.
- Total repository interfaces.
- Removal of legacy fallbacks and casts; schema-parsed RPC results.
- Route decomposition into hooks and presentational components.

### Explicitly Out of Scope

- Any behaviour, copy or visual change.
- Server-side changes.
- Admin page decomposition unless trivial.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] No user-visible behaviour changes and the existing test suite passes unchanged in intent.
- [ ] Recipes, planned meals, pantry, freezer and shopping are cached per household and navigating between tabs does not refetch fresh data.
- [ ] Repository interfaces have no optional methods and routes contain no fallback branches.
- [ ] Legacy schema fallbacks are removed and a schema error never drops a recipe link.
- [ ] No `as never` or unvalidated cast remains in `src/infrastructure`.
- [ ] No route component exceeds 400 lines.
- [ ] Any new dependency is justified in the PR.

## Technical Direction

- TanStack Query is the proposed cache; justify it in the PR per AGENTS.md or implement a minimal in-house cache if rejected.
- Deliver as stacked PRs, one route each, Shopping first, each independently releasable.
- Test doubles in `tests/renderApp.tsx` must implement the total interfaces.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Existing unit, integration and Playwright suites are the regression net; add cache invalidation tests per mutation.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Approve adding `@tanstack/react-query` as a production dependency.

## Pull Request

Title: `CS-121: Share loaded data between screens and remove unsafe repository fallbacks`
