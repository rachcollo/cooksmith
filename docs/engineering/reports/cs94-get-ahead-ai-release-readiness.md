# CS-94 implementation report

## Outcome

CS-94 adds the controlled product path needed to evaluate and activate Get Ahead AI without
removing the ordinary preparation checklist.

The implementation:

- carries the selected household through the client and verifies active membership server-side;
- invalidates preparation cache entries across AI mode, model, prompt and corpus identity;
- adds a safe current-plan retry and calm AI-assisted, usual-checklist and fallback labels;
- persists versioned 30-case evaluation runs, case evidence and explicit acceptance;
- runs the 30-case synthetic corpus through a protected administrator Edge Function, including
  ten deliberately ambiguous model-assisted cases;
- gates activation on deployment-bound smoke evidence and an accepted current evaluation;
- provides an ordered admin readiness checklist with separate run, accept and enable actions; and
- deploys the evaluation function through the protected Edge Function release workflow.

## Data and security

Migration `20260730230000_cs94_weekly_preparation_release_readiness.sql` is additive. Evaluation
case evidence contains synthetic identifiers and aggregate outcome/usage metadata only. It does
not persist recipes, prompts, provider responses, secrets or provider request identifiers.

Evaluation execution and acceptance require the application-admin contract. Household plan
generation verifies the explicitly selected household against active membership before loading
meals or enrichment. New tables use RLS and least-privilege grants.

## Configuration

The protected evaluation function requires:

- `OPENAI_API_KEY`;
- `WEEKLY_PREPARATION_MODEL`;
- `COOKSMITH_DEPLOYMENT_SHA`;
- `OPENAI_INPUT_COST_AUD_PER_MILLION`;
- `OPENAI_OUTPUT_COST_AUD_PER_MILLION`;
- the existing Supabase URL, anon key and service-role configuration.

No secret value is returned to the browser. `COOKSMITH_DEPLOYMENT_SHA` binds hosted evidence to the
deployed candidate.

## Validation

Passed locally:

- `npm ci --cache=/tmp/cooksmith-npm-cache-2`
- `npm run format`
- `npm run format:check`
- `npm run docs:commands:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test` — 63 files, 319 tests
- `npm run build`
- `npm run db:config:check`
- `git diff --check`

The repository preflight reached the Supabase CLI check but the CLI could not create its runtime
directory under the managed read-only `/root` path. Local Supabase reset, lint, pgTAP, generated
type regeneration, Playwright, hosted smoke, provider evaluation and manual responsive/accessibility
checks therefore remain CI/Preview/release gates and are not claimed as passed here.

## Release and rollback

This pull request does not deploy Production or run the provider evaluation.

After merge, release the exact approved `main` SHA in this order:

1. run the protected Production database release for the new forward migration;
2. configure `COOKSMITH_DEPLOYMENT_SHA` for that exact SHA;
3. run the protected Edge Function release, including `evaluate-weekly-preparation`;
4. deploy the application from the same SHA;
5. keep AI disabled while running the admin 30-plan evaluation;
6. review and explicitly accept the current evaluation;
7. separately enable AI assistance; and
8. verify one controlled household plan, fallback and retry.

Rollback is to activate the emergency stop and disable AI assistance. Preserve audit and evaluation
evidence and use forward migrations for database correction.

## Cost

No dependency or provider is added. The implementation has A$0 fixed monthly and annual cost.
Running the evaluation makes ten bounded calls to the already approved configured OpenAI model.
Actual token counts and estimated A$ cost are persisted using the existing approved pricing-rate
configuration.
