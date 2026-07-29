# CS-93 handover — shared recipe enrichment and safe backfill

## Outcome

Recipe Intelligence now has database-enforced source identity for household
and active public shared recipes. The worker and Get Ahead path resolve the
exact source/version, while `/admin` provides protected preview, start,
pause/resume, retry and progress controls. Start, resume and retry initiate a
server-side worker chain that drains eligible queued jobs one at a time.

The provider-assisted quality follow-up adds an audited Recipe Intelligence AI
control separate from weekly-plan AI, versioned `provider-assisted-v1` jobs,
strict culinary metadata output and an explicit **Re-enrich with AI** action.
The original deterministic job/result evidence remains recoverable.

## Release order

1. Merge only after quality, database and Preview checks pass.
2. Release migrations through
   `20260728190000_recipe_intelligence_ai_controls.sql`
   through the protected Production database workflow for the approved
   40-character `main` SHA.
3. Deploy the application and `enrich-recipe` from that SHA.
4. Verify the application deployment. Keep weekly-plan AI disabled.
5. In `/admin`, enable **Recipe Intelligence AI**, then separately confirm
   **Re-enrich with AI**.
6. Monitor queue state, failures, latency, token use and estimated A$ cost.
   Pause on unexpected cost, repeated failures, stale activation or any
   isolation concern.
7. Verify a synthetic mixed-source plan and deterministic fallback.

## Recovery

Pause enrichment or activate the existing emergency stop. Preserve versions,
jobs, results and audit evidence. Roll application/functions back where safe
and correct schema defects with a new forward migration. Never edit or delete
Production recipe rows to recover the backfill.

## Validation

Local TypeScript, lint, unit/integration, build, documentation and database
configuration checks passed. Docker/local Supabase and hosted Preview were not
available in the implementation workspace and remain required CI/review
evidence. No Production system or data was accessed.

## Cost and security

No dependency or baseline recurring cost was added. Provider-assisted work
uses the existing approved budget and remains disabled unless separately
enabled. Browser responses contain aggregate counts only; provider and worker
secrets remain server-side.

## Provider failure canary follow-up

The provider error boundary now preserves `permanent_provider` and
`transient_provider` categories instead of collapsing structured OpenAI errors
to `internal_validation`. Operational output is limited to the HTTP status,
validated provider code and, when OpenAI identifies one, a validated rejected
schema-keyword name. Provider messages, response bodies, recipe content and
credentials are never logged.

**Retry failed** now runs one provider-assisted job as a canary and does not
self-dispatch the remaining queue. After deployment, review that single job
and the Edge Function operational event. Select **Resume enrichment** only
after the canary completes successfully.

This follow-up started from `main` commit
`5c595b853030b5e777c38ef1e595d113db1e62eb`. It changes no migrations,
dependencies, provider model, provider pricing or budget. Formatting, lint,
strict TypeScript, 311 Vitest tests, production build, documentation-command
audit, database configuration, dependency audit, secret scan and whitespace
validation passed locally. Hosted provider canary and GitHub CI remain release
evidence.

## Provider JSON-mode recovery

After repeated provider-side `400` rejections occurred before token generation,
Recipe Intelligence now requests a plain JSON object instead of submitting a
strict JSON Schema to OpenAI. The trusted Cooksmith boundary still rejects
malformed output, missing or duplicate values, an incorrect ingredient count,
unknown ingredient or step references, source mismatches and unsupported data
before activation. This removes provider-schema compatibility as a runtime
dependency without weakening the stored enrichment contract.

Deploy the updated `enrich-recipe` function, select **Retry failed** once and
review the single provider-assisted canary. Select **Resume enrichment** only
after that canary completes and its activated result passes the existing
quality review.

This recovery started from `main` commit
`021ee01dfeff762f0c87180e9a316bd98d89b255`. It adds no migration, dependency,
provider model, pricing or budget change. The remaining provider call is the
approved hosted canary and must not include real recipe content in logs or
repository fixtures.

## Structured provider recovery

The diagnostic canary proved the configured GPT-5 mini model was unavailable to
the Cooksmith OpenAI project. Changing the runtime model secret to
`gpt-4.1-mini` reached the provider successfully, while JSON mode returned an
object that did not satisfy Cooksmith's activation contract.

Recipe Intelligence therefore uses Responses API Structured Outputs again with
the provider-compatible schema. The schema requires every field and rejects
additional object properties, while Cooksmith continues to enforce exact
ingredient count, source references, uniqueness and domain validation before
activation. The schema intentionally contains no `uniqueItems`, `minItems` or
`maxItems` keywords.

Deploy the updated `enrich-recipe` function, select **Retry failed** once and
review the single provider-assisted canary. Select **Resume enrichment** only
after the canary completes and its activated result passes the existing quality
review.

This correction starts from `main` commit
`2aef3a2a5e92eaa5302f86a81235d7fd4653043e`. It adds no migration, dependency,
provider model, pricing or budget change.

## Provider timeout correction

The first structured-output canary reached `gpt-4.1-mini` but exceeded the
worker's original 12-second provider deadline. The provider deadline is now 60
seconds. Its job lease is 90 seconds so a response cannot outlive the claim
before Cooksmith validates, activates and records the result.

Fetch aborts raised by the deadline are explicitly recorded as `timeout`
instead of `internal_validation`. All provider output still passes Cooksmith's
ingredient-count, source-reference, uniqueness and domain validation before
activation. The provider diagnostics, AI-only single-canary selection and
no-chain canary behaviour remain unchanged.

Deploy the updated `enrich-recipe` function, select **Retry failed** once and
confirm that the single provider-assisted canary completes and activates. Keep
**Resume enrichment** disabled until that result and its cost/usage metadata
have been reviewed.

This correction starts from `main` commit
`3dcbb15180e95be779bc0518113a89f9460e2316`. It adds no migration, dependency,
provider model, pricing or budget change.
