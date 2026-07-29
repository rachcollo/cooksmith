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
