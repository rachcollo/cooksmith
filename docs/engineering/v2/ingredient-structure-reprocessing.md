# Ingredient structure reprocessing (CS-101)

## Contract and source coverage

`recipe-content-v2` derives `ingredient-structure-v1` / `ingredient-structure-rules-v1`. Recipe Intelligence remains schema v3 with rules `cooksmith-rules-v4`. Original recipe text and ingredient lines remain authoritative; old source rows are not rewritten. Source IDs/version, original quantities, explicit/verified convention and conversion IDs remain traceable.

All saved household, public-import and owner-only private-import rows use the shared read projection and Shopping generation. Current CS-93 Get Ahead enrichment covers household recipes and public imports. Private imports are not silently published or processed through a service-role shortcut. ADR013 still requires preparing/unavailable states until validated model-assisted preparation exists. “Deterministic fallback” means ingredient interpretation for Shopping and intelligence construction, not a fallback household checklist.

## Owner decision and release checklist

On 2026-10-05 the owner accepted temporary Get Ahead preparing/unavailable during the pre-MVP v4 transition: “As long as we keep building at pace I’m happy to have it unavailable”. AC2 is clarified for this transition: Shopping retains deterministic ingredient handling; Get Ahead gives an honest state until validated model-assisted opportunities exist, not a deterministic checklist. ADR013 remains unchanged. No zero-downtime/candidate implementation is needed. This decision does **not** authorise this agent to merge, deploy, pause/resume production workers, backfill or run paid generation.

Owner-operated checklist (execution requires the corresponding owner approval):

1. Confirm final PR188 checks, database backup/history and a schema-first activation plan. Pause/drain the enrichment worker before the mixed-version window. Confirm how the new Vercel app will be held from serving traffic until the database is ready: it selects/writes the new column. Temporary Get Ahead downtime does not authorise broken recipe/Shopping operations.
2. Merge PR188 when ready to release. **Merge automatically starts Vercel Production deployment, main CI, Jira sync, and both Production database/Edge Function workflows.** Both GitHub deployment jobs await the `production-database` required-reviewer approval (verified read-only on 2026-10-05); Vercel is independent. There is no automatic database-before-Edge-before-app dependency. Do not approve both release jobs together or assume merge is code-only.
3. For the exact resulting main SHA, approve **Production database release** first after backup/history review. It shows history, runs a dry-run, then applies all pending migrations and verifies history. Expected CS-101 order: `20261005015715_shared_ingredient_structure.sql`, then `20261005025707_preserve_structure_refresh_overrides.sql`. Leave the out-of-order exception off. There is no second approval between that workflow's dry-run and apply.
4. After database success, approve **Production Edge Function release** for the same SHA. It deploys all five listed functions, including the enrichment worker and Get Ahead endpoint, and sets deployment identity. Verify matching Vercel app activation and schema/function contracts. Keep enrichment paused until processing is separately authorised.
5. **Only now run recipe AI enrichment**, with explicit paid-processing approval: resume the worker, review Admin counts/budgets, choose **Refresh ingredient structure**, and monitor the bounded batch (at most 100 sources). Recount rather than assume the earlier 47-source snapshot is unchanged. Existing AI is enabled, so resuming can process queued jobs; resume is itself part of the paid-run decision. Do not substitute the older reprocess-AI command or enable/increase budgets incidentally.
6. Complete authenticated acceptance: import/save→plan→Shopping, explicit list refresh/overrides/bought state, then validated v4 Get Ahead output and cache replacement after enrichment. Missing/failed results remain honestly unavailable. Weekly generation can also incur provider usage. Existing lists need **Refresh recipe amounts**; opening the page does not rewrite them. Record actual evidence before beta/Get Ahead completion; deployment verification's public smoke/Jira status is not functional proof.

No code blocker is known with green exact-head checks and accepted temporary Get Ahead downtime. Remaining release prerequisites are owner approvals and verified schema-first app/function coordination. If the independent Vercel activation cannot be held until schema readiness, resolve that operational sequencing before merging; do not promise Shopping availability during an incompatible deployment. Hosted acceptance, restored v4 coverage and physical Safari/VoiceOver checks remain uncompleted acceptance evidence, not zero-downtime implementation scope.

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

## Rules-v4 transition gate

Do not deploy solely because CI passes. Strict v4 consumption excludes existing v3 results even though their rows are retained. Read-only Production aggregates on 2026-10-05 found 2 household plus 45 public/shared active v3 results, zero active v4 results, and all 47 eligible sources needing a v4 queue entry. These counts do not establish which households currently have useful tasks. The owner now accepts temporary unavailability; separately authorised provider-assisted re-enrichment is still needed to restore usable current opportunities. No continuity implementation is required. Uncached weekly-plan generation may also use the existing paid provider. No such work has been executed.

The owner has accepted AC2's narrower preparing/unavailable behaviour for this pre-MVP transition; the literal deterministic-checklist promise is not implemented. The implementation retains fail-closed behaviour. Hosted authenticated acceptance and owner-only private-import enrichment coverage are not claimed.
