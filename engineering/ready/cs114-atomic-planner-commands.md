# Engineering Package CS-114: Apply, replace and move planned dinners safely in one step

## Metadata

- **Jira issue:** `CS-114`
- **Jira link:** https://smillins.atlassian.net/browse/CS-114
- **Epic:** Meal Planning (CS-4)
- **Priority:** High
- **Status:** `Planned`
- **Branch:** `fix/cs-114-atomic-planner-commands`
- **Depends on:** None
- **Blocks:** CS-118, CS-121
- **Package path:** `engineering/ready/cs114-atomic-planner-commands.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S4, S7, C6 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Publication and Build Gate

This publishes planning documentation only, not implementation approval. Keep this package Planned and exclude it from automated pickup until the following gate is explicitly resolved:

- Review any production duplicate-dinner report and obtain the owner's explicit resolution decision before implementing or releasing the uniqueness migration.

## Product Outcome

Applying a week, replacing a week and moving a dinner either fully succeed or change nothing, and Cooksmith keeps what it says it will keep.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Replace my week says "Prepared freezer reservations will be kept" (`src/routes/meal-plans/WeekPlanGenerator.tsx:351`) but `applyPlan` removes every dinner in the week (`:284-288`).
- Apply is a sequence of up to 21 browser requests (`:279-312`).
- `planned_meals` has no uniqueness on household, date and meal type; `PlanPage` renders the first match only (`src/routes/PlanPage.tsx:669`).
- Move and swap are two independent updates and do not reconcile Shopping (`src/routes/PlanPage.tsx:530-538`).
- Save dinner then `reconcile_planned_meal_shopping` are separate requests (`src/routes/PlanPage.tsx:409-449`).
- `weekGeneration.ts:49-57` targets past days of the current week.

## Scope

### Included

- One idempotent RPC to apply a proposed week, including replace semantics and Shopping reconciliation.
- One RPC to move or swap dinners.
- One RPC to save a dinner with its Shopping contribution.
- A uniqueness rule for one dinner per household per date, with a safe duplicate report first.
- Proposals limited to today onwards.

### Explicitly Out of Scope

- Quick-add date selection (CS-107).
- Undo, Move button and two-tap planning UI (CS-118).
- Additional meal types (CS-61).

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Apply and Replace run as one transactional, idempotent database command including Shopping reconciliation.
- [ ] Replace never removes freezer-reserved or completed dinners and the review screen lists exactly what will be removed.
- [ ] A household cannot hold two dinners on one date; existing duplicates are reported and resolved without data loss before the constraint is enforced.
- [ ] Move and swap are one atomic command and leave Shopping consistent.
- [ ] A failed command changes nothing and the user sees a retry action.
- [ ] Generated proposals never target dates before today.
- [ ] pgTAP covers membership, cross-household denial, idempotent retry and concurrent edits.

## Technical Direction

- Follow the operation-id pattern of `record_shopping_stock_purchase` and `freezer_command`.
- Security invoker with explicit membership check and `set search_path = ''`.
- Enforce uniqueness with a partial unique index on `(household_id, meal_date)` where `meal_type = 'dinner'`, added only after the duplicate report is clean.
- Keep ingredient derivation in the client for now; pass ingredient inputs to the RPC as today.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- pgTAP for each RPC and the constraint.
- HTTP conflict tests alongside `scripts/http`.
- Integration: replace with freezer and completed dinners present; mid-failure leaves the week unchanged.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Yes: three RPCs and a unique index. Hosted release needs the duplicate report reviewed first.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- If duplicates exist in production, which dinner wins? Recommended: keep the most recently updated and convert the other to a note on it, after owner review.

## Pull Request

Title: `CS-114: Apply, replace and move planned dinners safely in one step`
