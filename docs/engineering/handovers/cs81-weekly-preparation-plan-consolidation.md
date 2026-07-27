# CS-81 weekly preparation plan consolidation handover

## Status

Implemented, hosted and database validation pending.

## Baseline and scope

- Baseline: `main` at `8049949ceeba6fd40ce1b2f2ecf77b9e58de8c39`.
- Branch: `feat/cs-81-weekly-preparation-plan-consolidation`.
- Implements a provider-neutral weekly preparation domain contract, deterministic compatibility
  and quantity consolidation, strict model-decision validation, deterministic fallback, cache
  invalidation and household-scoped persistence.
- Adds a protected Edge Function with strict OpenAI structured output. AI remains disabled by
  default.
- Adds 30-plan synthetic evaluation evidence.

## Data and release impact

- Migration: `20260727220000_weekly_preparation_plans.sql`.
- Edge Function: `generate-weekly-preparation-plan`.
- Production is not changed by this pull request. After merge, release the exact accepted `main`
  SHA through both protected Production database and Production Edge Function workflows.
- Rollback the Edge Function/application contract by revert. Use a forward migration for any
  released schema correction.

## Validation

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

CI must run the full database and browser gates. AI must remain disabled until the representative
hosted provider evaluation confirms structured-output quality, latency and cost.

## Security, privacy and cost

- Provider credentials remain server-side.
- Persisted plans are household-scoped with RLS; settings are service-role only.
- Model output can only reference supplied candidate IDs and cannot bypass deterministic safety
  boundaries.
- No recipe content or provider payload is logged.
- New dependency cost is A$0. Provider cost is A$0 while AI remains disabled. Enabling AI uses the
  already approved OpenAI account and remains subject to the configured monthly budget.
