# Engineering Package CS-105: Ordinary household recipe saves cannot wake the enrichment worker

## Metadata

- **Jira issue:** `CS-105`
- **Jira link:** https://smillins.atlassian.net/browse/CS-105
- **Epic:** Recipe Library (CS-5)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `fix/cs-105-household-enrichment-wake`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs105-household-enrichment-wake.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S9 (confirms the 15 Oct production observation) (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

When an ordinary household member saves or materially edits a recipe, enrichment for that recipe starts without admin access and without visiting Get Ahead, and a stranded queue drains on its own.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `wakeRecipeEnrichment` invokes `enrich-recipe` with the user session and swallows the result (`src/infrastructure/recipes/supabaseRecipeRepository.ts:231-241`).
- `isAuthorised` accepts only application admins or the worker token (`supabase/functions/enrich-recipe/index.ts:128-140`).
- No migration schedules a worker. Get Ahead resumes work through its server-side token path.
- Usage limits and concurrency are enforced in `claimJob` and `withinUsageLimits` (`:150-215`).

## Scope

### Included

- A bounded, member-authorised wake for the caller's own household recipe jobs.
- A scheduled drain using the worker token.
- Preservation of admin-only global dispatch and backfill.

### Explicitly Out of Scope

- Duplicate intermediate-version job overhead (review separately, per the story).
- Model, prompt or limit changes.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Create or material edit by an ordinary member reaches a validated current enrichment without admin access or visiting Get Ahead.
- [ ] Unauthorised and cross-household dispatch is blocked.
- [ ] A member wake cannot trigger catalogue-wide or backfill processing.
- [ ] Pending jobs are drained without user action by a scheduled worker.
- [ ] Existing daily, monthly and concurrency limits still apply to member-initiated work.

## Technical Direction

- Member path: verify JWT and household membership for the specific recipe, then process only jobs for that recipe.
- Scheduler options: `pg_cron` with `pg_net` calling the function with the worker token, or a Supabase scheduled function. Choose the one already enabled on the hosted plan.
- Never expose the worker token to the browser.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: `recipeEnrichmentEdgeFunction` authorisation matrix.
- pgTAP for any schedule or claim change.
- Integration: save as member then enrichment state.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Likely: schedule definition.
- **Expected Edge Function:** Yes: enrich-recipe. Protected release approval required.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** No new provider. Enrichment spend stays inside existing caps.

## Deferred Work and Open Questions

- Which scheduler is available on the hosted Supabase plan, and what interval is acceptable (recommended: every 5 minutes)?

## Pull Request

Title: `CS-105: Ordinary household recipe saves cannot wake the enrichment worker`
