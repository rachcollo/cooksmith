# Recipe Intelligence

CS-90 adds recipe-level enrichment beside the approved recipe. It never rewrites recipe content and it is not required for recipe, plan, shopping, pantry or existing Get Ahead flows.

## Processing contract

1. Recipe and structured-content changes commit normally.
2. Database triggers create an immutable content snapshot and idempotent pending job.
3. The protected `enrich-recipe` Edge Function claims one job with a bounded lease.
4. Deterministic rules resolve known aliases, units, quantities, actions and source links first.
5. When enabled, only unresolved ingredient and step excerpts are sent to OpenAI using strict structured output.
6. Local validation rejects unknown source IDs or step IDs.
7. One database function atomically checks the current recipe version, deactivates the previous result and activates the replacement.
8. Failed or stale work keeps the previous valid result and does not affect the approved recipe.

## Required Edge Function secrets

- `OPENAI_API_KEY`
- `RECIPE_INTELLIGENCE_WORKER_TOKEN`
- `RECIPE_INTELLIGENCE_MODEL` (defaults to `gpt-5-mini-2025-08-07`)
- `OPENAI_INPUT_COST_AUD_PER_MILLION`
- `OPENAI_OUTPUT_COST_AUD_PER_MILLION`

The Supabase project supplies `SUPABASE_URL` and either `SUPABASE_SECRET_KEYS` or the legacy `SUPABASE_SERVICE_ROLE_KEY`. Secret values must never use a `VITE_` prefix, appear in logs or be committed.

## Safe enablement

`cooksmith.recipe_intelligence_settings` is server-managed. Defaults are:

- enqueueing on;
- provider-assisted processing off;
- emergency stop off;
- 25 recipes per day;
- A$10 monthly provider ceiling; and
- two concurrent jobs.

Deploy the database migration before the Edge Function. Keep `ai_enabled = false` until the provider-assisted evaluation is accepted. The deterministic worker can run without spending OpenAI credits.

Invoke the worker with `POST /functions/v1/enrich-recipe` and the secret
`x-cooksmith-worker-token` header. Each call processes at most one pending job.
Repeated delivery is idempotent by source, recipe version and processing
identity.

## Shared recipes and existing-recipe backfill

CS-93 extends the same enrichment contract to active public rows in
`imported_recipes`. Versions, jobs and results carry an explicit `household`
or `shared_platform` source kind plus the matching foreign key.
Exactly-one-source constraints prevent equal UUIDs in the two recipe tables
from colliding. Shared results have no household owner and may be reused by
any authenticated household that can already read the public recipe; private
household results retain household RLS.

The protected Admin recipe-enrichment section previews eligibility by source,
starts bounded idempotent batches, reports aggregate state, pauses new claims,
resumes work and retries eligible failures. Commands are authorised and
audited in the database. They do not expose recipe text or enable either AI
setting. Production backfill is a separate operator action after the database,
Edge Functions and application are released from the same approved `main`
SHA.

## Rollback

Set `emergency_stop = true` to stop processing immediately, or set `enqueue_enabled = false` to stop new jobs. Preserve versions, jobs and results for auditability. Revert application/function wiring and use a forward migration for released schema corrections.
