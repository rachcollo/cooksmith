# Recipe Intelligence

CS-90 adds recipe-level enrichment beside the approved recipe. It never rewrites recipe content and it is not required for recipe, plan, shopping, pantry or existing Get Ahead flows.

## Processing contract

1. Recipe and structured-content changes commit normally.
2. Database triggers create an immutable content snapshot and idempotent pending job.
3. The protected `enrich-recipe` Edge Function claims one job with a bounded lease.
4. Deterministic rules resolve known aliases, units, quantities, actions and source links first.
5. When enabled, ingredient and step excerpts are sent to OpenAI using strict
   structured output. The provider may improve canonical names, aliases,
   modifiers, quantities, preparation actions/details and source-step links,
   but cannot add source identifiers or rewrite the original recipe.
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

Recipe Intelligence AI is separate from weekly preparation AI. An application
administrator can enable or disable it in the Recipe enrichment section of the
admin portal. Enablement is confirmed, audited and displays the configured
monthly A$ provider ceiling. It does not change existing results by itself.

**Re-enrich with AI** creates a separate `provider-assisted-v1` job for each
current eligible recipe version. It never reopens, deletes or overwrites the
completed deterministic job. Atomic activation retains one current enrichment
per recipe while preserving both result records for comparison and rollback.
Repeated reprocessing is idempotent for that processing identity.

While Recipe Intelligence AI is enabled, future recipe imports and material
edits automatically queue a provider-assisted job beside the deterministic job.
Disabling it returns new recipe versions to deterministic-only processing.

The admin start, resume and retry commands invoke the worker using the signed-in
admin session. The function verifies the application-level admin role before it
processes work. After each terminal job outcome, the worker dispatches another
protected invocation using the server-only `x-cooksmith-worker-token`. Each
invocation processes at most one pending job and the chain stops when the queue
is empty, processing is paused, the emergency stop is active or an operational
error occurs. **Retry failed** is deliberately a single-job canary: it makes
failed jobs eligible again but processes only the oldest one. An operator
reviews that outcome before selecting **Resume enrichment** to drain the
remaining queue. Repeated delivery is idempotent by source, recipe version and
processing identity.

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
audited in the database. Start, resume and retry also initiate the protected
worker chain so queued jobs advance without a separate operator invocation.
They do not expose recipe text or enable either AI setting. Production backfill
is a separate operator action after the database, Edge Functions and
application are released from the same approved `main` SHA.

For the initial provider-assisted quality run:

1. Release the AI-control migration, application and `enrich-recipe` function
   from the same approved `main` SHA.
2. Confirm the OpenAI key, model and A$ input/output rates are configured
   without printing their values.
3. Enable **Recipe Intelligence AI** in Admin.
4. Select **Re-enrich with AI** once.
5. If provider jobs fail, select **Retry failed** once after the fix, review the
   single canary outcome, then select **Resume enrichment** only when the canary
   completes successfully.
6. Review failures, token/cost totals and structured quality before relying on
   Get Ahead. Compare canonical-name cleanliness, resolved ingredient links,
   preparation actions/details, aliases, unknown quantities and confidence
   with the deterministic baseline.
7. Disable Recipe Intelligence AI or activate the emergency stop if results
   contain invented content, costs exceed expectations or provider failures
   become material.

## Rollback

Set `emergency_stop = true` to stop processing immediately, or set `enqueue_enabled = false` to stop new jobs. Preserve versions, jobs and results for auditability. Revert application/function wiring and use a forward migration for released schema corrections.
