# CS-94 implementation report

## Opportunity-level eligibility follow-up — 2026-08-04

The v11 planner removes the contradictory full-recipe keyword scan from candidate eligibility.
Recipe Intelligence already identifies a specific preparation action and supplies source IDs,
lead-time metadata and safety boundaries; those fields now form the shared eligibility contract
used by deterministic planning, model input and output validation. Full source prose remains
available for task detail but is not treated as though every surrounding cooking step belongs to
the selected preparation opportunity.

The 30-case release corpus now includes realistic cooking language around safe opportunities and
covers 15, 30, 45 and 60-minute budgets. Telemetry and evaluation evidence distinguish actual
provider requests from deliberate no-candidate safety cases. A forward migration disables v10,
invalidates its cache and requires fresh v11 evaluation plus hosted household smoke evidence.

## Opportunity-level eligibility follow-up — 2026-08-04

The v11 planner removes the contradictory full-recipe keyword scan from candidate eligibility.
Recipe Intelligence already identifies a specific preparation action and supplies source IDs,
lead-time metadata and safety boundaries; those fields now form the shared eligibility contract
used by deterministic planning, model input and output validation. Full source prose remains
available for task detail but is not treated as though every surrounding cooking step belongs to
the selected preparation opportunity.

The 30-case release corpus now includes realistic cooking language around safe opportunities and
covers 15, 30, 45 and 60-minute budgets. Telemetry and evaluation evidence distinguish actual
provider requests from deliberate no-candidate safety cases. A forward migration disables v10,
invalidates its cache and requires fresh v11 evaluation plus hosted household smoke evidence.

## Planner lifecycle reliability follow-up — 2026-08-04

The v10 planner treats a useful non-empty task set as the only cacheable success. It automatically
removes invalid cache rows, expands identity across meal and preparation eligibility inputs, and
reloads current meals and recipes before creating a session. Internal Edge Function dispatch now
supplies the required Supabase gateway API key and uses compatible provider and outer time budgets.

The existing generation-attempt table now receives bounded outcome, reason, timing and token
metadata for successful, validation-rejected and provider-failed attempts. The telemetry excludes
recipe text, meal names, prompts, provider payloads, secrets and direct household identifiers in
the request key. A forward migration disables v9, clears smoke evidence and requires fresh v10
evaluation acceptance before AI can be enabled again.

The synthetic evaluator alone may accept a zero-task decision for its deliberate honest-empty
safety cases. Household generation does not use that option, so an empty response is never saved or
returned as a successful Get Ahead session.

## Meal-strategy correction — 2026-08-01

The household planner now sends the selected preparation duration and complete selected-meal context to the AI operation. The model creates an ordered, time-bounded make-ahead strategy instead of merely grouping candidates that deterministic code had already approved.

Server validation permits only traceable source candidates, rejects unsupported or unsafe cooking fragments, enforces the selected time budget and accepts an honest empty plan when no worthwhile work exists. Model-provided task estimates and storage guidance flow into the household checklist without exposing internal reasoning.

The v3 readiness corpus contains 30 distinct five-meal cases across 15, 30 and 60 minute sessions. It covers shared prep, single worthwhile tasks, unsafe candidates, raw-protein boundaries and honest empty plans. Each case now records the exact deterministic or product-quality failure reason. A run passes only when all cases meet their case-specific expectations; a failed review does not create smoke-ready evidence. The accompanying forward migration disables AI, advances the corpus identity and requires a fresh accepted evaluation before re-enablement.

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

## Trustworthy household task follow-up — 2026-08-02

Real household testing showed that model-assisted plans could copy long recipe instructions into
task titles, retain serving or cooking steps misclassified by recipe enrichment, omit recipe
context and label estimated future time savings as prep time still available. The v6 planner now
uses model output for selection and ordering only when its visible title is concise and
preparation-specific. Otherwise it derives a short title from the validated canonical action and
ingredient. Cooking and serving sentences are rejected at candidate eligibility, each ordinary
task names its recipe, and the progress card reports remaining session minutes.

Regression coverage reproduces the observed marinade and serving-instruction failures. Formatting,
lint, strict types, all 364 Vitest tests, production build, documentation command audit, database
configuration, secret scanning and the production dependency audit pass. The Supabase CLI remains
unable to create `/root/.supabase` in this managed runner, so reset, lint, pgTAP and generated-type
freshness remain required GitHub CI gates. Hosted provider generation and mobile verification
remain post-deployment checks.

## Recipe-level preparation intelligence follow-up — 2026-08-02

Real household testing proved that the weekly model received too few useful candidates because the
v1 enrichment contract stored only per-ingredient action labels. Recipe Intelligence v2 now stores
validated make-ahead opportunities derived from complete recipe ingredients and instructions,
including grouped vegetables, raw-protein preparation, marinades, sauces, spice mixes and suitable
advance components. The weekly planner consumes these source-linked opportunities and filters them
against meal timing before model selection.

Lead time and separation boundaries remain deterministic planning controls. The checklist no
longer displays “use within” or other storage-deadline suggestions. The 30-plan review now checks
meal coverage as well as task usefulness, time and traceability, preventing a multi-meal portfolio
from passing with one isolated task when more supported work exists.
