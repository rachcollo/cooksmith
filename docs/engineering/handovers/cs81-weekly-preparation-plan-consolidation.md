# CS-81 weekly preparation plan consolidation handover

## Status

Implemented and released. Final authenticated household smoke confirmation and documentation closure pending. Reconciled on 1 October 2026.

## Baseline and scope

- Baseline: `main` at `8049949ceeba6fd40ce1b2f2ecf77b9e58de8c39`.
- Branch: `feat/cs-81-weekly-preparation-plan-consolidation`.
- Implements a provider-neutral weekly preparation domain contract, deterministic compatibility
  and quantity consolidation, strict model-decision validation, deterministic fallback, cache
  invalidation and household-scoped persistence.
- Adds a protected Edge Function with strict OpenAI structured output. AI was disabled by
  default at implementation; production is now explicitly enabled following CS-94 evaluation acceptance.
- Adds 30-plan synthetic evaluation evidence.

## Data and release impact

- Migration: `20260727220000_weekly_preparation_plans.sql`.
- Edge Function: `generate-weekly-preparation-plan`.
- Production is not changed by this pull request. After merge, release the exact accepted `main`
  SHA through both protected Production database and Production Edge Function workflows.
- Rollback the Edge Function/application contract by revert. Use a forward migration for any
  released schema correction.

## Original local validation (historical)

Passed locally:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`: 56 files, 287 tests
- `npm run build`
- `npm run docs:commands:check`
- `npm run engineering:check-secrets`
- `npm run security:audit-production`

Unavailable locally:

- `npm run preflight` stopped because the retained runner could not install the pinned Supabase CLI.
- Database reset, lint, pgTAP and generated-type freshness require Docker, which is unavailable.
- Playwright could not start because the Chromium binary is unavailable.
- Hosted provider, Preview and production validation have not been run.

The unavailable checks above describe the original local runner, not the current delivery status.
Final implementation CI subsequently passed database tests, security contracts, generated types,
build and Playwright, as verified in the review handoff. Hosted provider evidence is recorded below.

## Security, privacy and cost

- Provider credentials remain server-side.
- Persisted plans are household-scoped with RLS; settings are service-role only.
- Model output can only reference supplied candidate IDs and cannot bypass deterministic safety
  boundaries.
- No recipe content or provider payload is logged.
- New dependency cost is A$0. Provider cost is A$0 while AI remains disabled. Enabling AI uses the
  already approved OpenAI account and remains subject to the configured monthly budget.

## Reconciled release and acceptance evidence

- Implementation PR: [#115](https://github.com/rachcollo/cooksmith/pull/115); package PR: [#97](https://github.com/rachcollo/cooksmith/pull/97).
- Implementation commits: `29e3ecb`, `322fe9f`, `bb1f2f9`, `d698d30`; merge SHA: `b548220670fb8103930d529b8c5205171d144694`.
- Production migration history confirms the original weekly-preparation migration and CS-91 admin-control migration are applied, together with CS-94 corrections through partial-plan enrichment repair.
- Production generation, retrieval and evaluation Edge Functions are active. Function versions do not independently prove their Git source SHA.
- Latest accepted evaluation: `a98fce1f-88f6-45c6-8676-639c56cb1551`, v13, deployment SHA `45262a232cdb9e17ff6f0c5c2b6166918f003383`; accepted 10 August 2026 at 11:12:11 UTC. Smoke verification references the same SHA at 10:49:30 UTC.
- 30 cases, 28 model calls, 2 deterministic cases, 28 valid-output count, 29 quality passes, zero unsupported outputs and zero fallbacks. Estimated evaluation cost A$0.021993. The valid-output count is a provider-output metric, not the overall quality score.
- Production settings show AI enabled and emergency stop inactive. Operational evidence shows 25 model-assisted attempts and 10 saved v13 plans with at least one task each; latest activity 7 September 2026.
- CS-65/CS-90 are Done; CS-91 integration PR #119 is merged and its Jira story is Done. Its early delivery comment cites CS-81's SHA before PR #119 merged, so it must not be reused as proof of that integration release.
- The original deterministic evaluation is retained separately from hosted evidence; see [evaluation report](../reports/cs81-weekly-preparation-evaluation.md).

## Remaining closure steps

The current browser is signed out. Confirm consolidated quantities/cut distinctions and expanded task detail, reopen the same plan to verify reuse, change meal/serving inputs to verify invalidation, and verify a usable fallback in an appropriate test environment. No authenticated browser verification is claimed here. Review and merge the documentation reconciliation, then record final product sign-off and move CS-81 to Done. Keep the non-safety fresh-finishers coverage improvement tracked under CS-94.

This documentation reconciliation starts from remote main `bf7c2a2c50dd6eac7a515cdde29113bd25ced765` on branch `docs/cs-81-delivery-evidence`. It changes no application code, migration, Edge Function, configuration or dependency. Additional fixed cost: A$0/month and A$0/year. No new evaluation or provider call was initiated.
