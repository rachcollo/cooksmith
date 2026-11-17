# Engineering Package CS-106: Weekly model generation records zero cost despite billable token usage

## Metadata

- **Jira issue:** `CS-106`
- **Jira link:** https://smillins.atlassian.net/browse/CS-106
- **Epic:** Get Ahead (CS-64)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `fix/cs-106-weekly-generation-cost-caps`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs106-weekly-generation-cost-caps.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C3 (extends the 15 Oct production observation) (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

Weekly preparation generation records its real estimated cost and stops calling the model when daily, monthly or per-household limits are reached, so spend cannot exceed the approved ceiling.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `recordAttempt` hardcodes `estimated_cost_aud: 0` (`supabase/functions/generate-weekly-preparation-plan/index.ts:68`).
- `weekly_preparation_settings` has `daily_plan_limit` and `monthly_cost_limit_aud` (`supabase/migrations/20260727220000_weekly_preparation_plans.sql:31-32`); the generator selects neither (`index.ts:157`).
- The cache key includes `availableMinutes` (`index.ts:176`) and `forceRetry` is forwarded from any member (`supabase/functions/get-weekly-preparation-plan/index.ts:412-434`).
- `enrich-recipe` already enforces equivalent limits (`supabase/functions/enrich-recipe/index.ts:177`).

## Scope

### Included

- Cost computed from actual usage and versioned rates.
- Unknown cost distinguished from zero, with a conservative reservation.
- Enforcement of daily and monthly limits before a model call.
- A per-household daily cap including forced retries.
- Cap refusals visible in Admin.

### Explicitly Out of Scope

- Prompt, model or evaluation changes.
- Provider invoice reconciliation.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Non-zero usage records the correct estimated cost from versioned rates.
- [ ] Cached and no-model responses record no new model charge.
- [ ] Unknown charges, including billed failures and timeouts, reserve a conservative budget and are not recorded as zero.
- [ ] The generator refuses a model call when the daily plan limit or monthly cost limit is reached and returns the usual non-AI plan.
- [ ] A per-household daily cap on model-backed generations applies, including forced retries.
- [ ] Cap refusals are visible in Admin.

## Technical Direction

- Mirror `withinUsageLimits` from `enrich-recipe`; share the rate table with it.
- Check limits before the provider call and record a reservation first so concurrent calls cannot overshoot.
- Do not claim invoice confirmation from an estimate.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: cost calculation, limit decisions, `weeklyPreparationEdgeFunctionContract`.
- pgTAP: settings and attempts.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Likely: per-household cap setting and cost rate version.
- **Expected Edge Function:** Yes: generate-weekly-preparation-plan and get-weekly-preparation-plan. Protected release approval required.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** Reduces exposure. No new cost.

## Deferred Work and Open Questions

- Per-household daily cap value. Recommended: 5 model-backed generations per household per day.

## Pull Request

Title: `CS-106: Weekly model generation records zero cost despite billable token usage`
