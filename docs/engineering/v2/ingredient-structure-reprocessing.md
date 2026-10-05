# Ingredient structure reprocessing (CS-101)

## Contract and source coverage

`recipe-content-v2` derives `ingredient-structure-v1` / `ingredient-structure-rules-v1`. Recipe Intelligence remains schema v3 with rules `cooksmith-rules-v4`. Original recipe text and ingredient lines remain authoritative; old source rows are not rewritten. Source IDs/version, original quantities, explicit/verified convention and conversion IDs remain traceable.

All saved household, public-import and owner-only private-import rows use the shared read projection and Shopping generation. Current CS-93 Get Ahead enrichment covers household recipes and public imports. Private imports are not silently published or processed through a service-role shortcut. ADR013 still requires preparing/unavailable states until validated model-assisted preparation exists. “Deterministic fallback” means ingredient interpretation for Shopping and intelligence construction, not a fallback household checklist.

## Release sequence (requires separate approval)

This PR does not deploy Production. Production deployment occurs only after merge through the protected **Production database release** workflow, for an explicitly approved exact `main` SHA. Verify backup, migration history and dry-run before applying `20261005015715_shared_ingredient_structure.sql`; released migrations are immutable.

Before a mixed-version rollout, pause the existing enrichment worker through approved administration. Apply the migration, release `enrich-recipe` and `get-weekly-preparation-plan` from the same approved SHA, then the compatible app. Verify function/version contracts before resuming. Older workers cannot label v3 output as a v4 result or replace an already active v4 result. No migration enables AI, starts a backfill, changes provider settings or deletes prior results.

## Preview and bounded processing

1. Open Admin with an authorised admin account and inspect **Ingredient refresh remaining**: separate household and shared counts. Queue states, failure counts and active/current coverage remain visible in the existing CS-93 panel.
2. Review the source limits, pause/emergency settings and existing daily/monthly budget. The refresh confirmation explicitly mentions existing enabled-AI usage. Do not enable AI or raise limits as an incidental part of this operation.
3. Choose **Refresh ingredient structure**. The existing command queues at most 100 eligible recipes. It excludes current-version v4 jobs, so repeated batches progress without duplicate jobs. The existing worker performs the bounded work; no new pipeline is introduced.
4. Refresh status, inspect current/failed counts and individual recipe results. Pause/resume remain available. Retry failed jobs through existing retry/recovery controls; an already queued failed v4 job is not counted as a new eligible recipe.
5. Validate representative source text, quantities, forms, preparation and step references before approving coverage. The old active result is retained until a replacement validates and activates. Source/version checks reject stale workers; metadata revisions invalidate Get Ahead cache identity.

Get Ahead may honestly show preparing/unavailable during the transition. Do not use the historical evaluation result or a public deployment smoke as proof of refreshed authenticated tasks. No paid evaluation was executed to validate this change.

## Existing Shopping lists

**Refresh recipe amounts** is an explicit household action, not a mutation on page load. It reads surviving meal contributions and current RLS-visible recipes, matches retained original lines/IDs, and submits up to 100 changed meals to an atomic compare-and-swap RPC. Already current source evidence is skipped; repeat to process further eligible meals. A summary reports unmatched/over-limit meals.

- Reprojection preserves bought state. If bought and unbought rows merge, the merged purchase remains unbought.
- Manual items and deliberate purchase overrides keep their values and names.
- Removed purchases are not recreated; newly added recipe lines are not silently added by this compatibility refresh.
- Recipe edits, removed contributions or another member's concurrent changes reject a stale batch. Reload and retry.
- Unmatched historical lines stay unchanged and are reported for review. The action does not claim that unsafe matches were refreshed.
- Ordinary material recipe edits continue through normal planned-meal reconciliation, which may reset bought state for changed amounts. This differs deliberately from explicit compatibility reprojection.

No Pantry records are merged or deleted. No shopping-period feature is introduced.

## Verification and recovery

Use synthetic local/approved staging recipes: garlic sliced/crushed/diced, unseen product names with supported prep, distinct oil grades, sugar substitution, handfuls and mixed fractions. Verify import/manual save/edit, legacy reads, known AU 120 mL EVOO total, unknown convention components, retained source notes and preparation. Exercise repeat refresh, manual override, bought state, removed purchases, stale version, unrelated/inactive household denial and source-ID collision. Check current Get Ahead preparation and cache replacement; missing/failed intelligence must not show a stale checklist.

Pause reprocessing on unexpected output. Preserve original recipes and previous enrichment rows, inspect versioned evidence, and use a forward correction. An app rollback can read the additive schema, but worker/rules compatibility must be coordinated; do not relabel old intelligence as current or delete user purchases. No automatic data rollback is supplied because approved recipes are not rewritten.
