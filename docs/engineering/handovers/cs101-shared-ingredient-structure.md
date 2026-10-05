# CS-101 handover: Shared lossless ingredient structure

- **Date:** 2026-10-05
- **Branch:** `feat/cs-101-shared-ingredient-structure`
- **Target:** `main`
- **Baseline:** `8592a4ff454aa3ced94106c7aabce48607d24a88`
- **Status:** Implemented; code review and hosted/manual acceptance remain separate gates. Exact-head checks and the PR URL are recorded on the delivery PR.
- **Package:** [CS-101](../../../engineering/ready/cs101-shared-ingredient-structure.md)
- **Decision:** [ADR015](../../architecture/decisions/015-shared-lossless-ingredient-structure.md)
- **Operations:** [Reprocessing and refresh runbook](../v2/ingredient-structure-reprocessing.md)

## Outcome

Preparation, purpose, alternatives and notes no longer contaminate generated purchasing names. Mixed fractions and handfuls retain their meaning. The same versioned projection drives authoring/imports, legacy recipe reads, Shopping and Recipe Intelligence. Original recipe text, ingredient/step references, material qualifiers and distinct olive-oil grades remain intact. Generic grammar and cross-consumer regressions cover fresh garlic and unseen ingredients; unknown wording stays conservative.

New saves persist the structure, and existing recipes are interpreted without blanket rewriting. Provider output cannot replace validated source structure. Shopping source metadata retains exact recipe source/version and original amounts. Get Ahead single-ingredient opportunities use source-backed preparation and quantities, including explicit/verified spoon conventions; activation identity invalidates previous caches.

The explicit **Refresh recipe amounts** action only reprojects surviving contributions that still match their recipe. It is bounded, repeatable and guarded against stale recipe/contribution snapshots. Already current evidence is skipped so subsequent batches progress. Bought state and deliberate manual adjustments survive; removed purchases are not recreated. Admin gets source-separated eligible counts and a bounded CS-93 reprocessing command, retaining pause/resume/retry and previous valid results until replacement.

This implements the approved CS-101 refinement; it does not redefine or defer the user's wider pre-MVP stories.

## Files and compatibility

- Domain: `recipes/ingredientStructure`, `contentDerivation`, `intelligence`; `shopping/purchaseIngredients`, `planGeneration`, `structureRefresh` and provenance types.
- Adapters: recipe persistence/read projection, shopping refresh and existing admin command port.
- UI: Shopping refresh/status, compact amount-first rows and combined-measure Edit; Admin counts/action. Planner source selection consistently uses its existing source discriminator helper. A forward compatibility fix preserves overrides when material recipe saves replace ingredient row IDs, without matching a different product/form or source kind.
- Edge Functions: **`enrich-recipe`**, **`get-weekly-preparation-plan`**.
- Migrations: **`20261005015715_shared_ingredient_structure.sql`**, then **`20261005025707_preserve_structure_refresh_overrides.sql`**; generated types regenerated from the isolated local schema. No dependencies added.
  PR187 was merged remotely at 2026-10-05 03:10 UTC as `eb498acd57cef00f5ce9da3821238ba69a945471`. This accepted main was merged into the CS-101 branch without rewriting history. Its ShoppingPage amount-first/combined-measure Edit and styles remain intact; only the CS-101 refresh action/status is added to that UI. All PR187 browser/component assertions remain, with the recipe-amount text check made exact to distinguish the new button. The central parser replaces its bounded display cleanup. PR188 targets main independently; no open-PR merge ordering remains. This executor did not merge or close PR187.

## Validation evidence

Local commands and synthetic evidence are recorded in `/tmp/cooksmith-review/cs101-*` in the saved executor. Test sources are committed and CI repeats the normal full Supabase and browser gates. The final local run passed: **586 app tests / 77 files**, **521 database assertions / 32 files**, **112 security-subset assertions** (included in the 521), **six upgrade-preservation assertions**, **20 actual local repository/API checks**, and **28 desktop/mobile browser checks**. Format, lint, TypeScript, build, explicit changed-Edge-Function type checking, schema lint/security advisors, generated-type freshness, preflight, 60-migration configuration, documentation audit, secret scan and production dependency audit passed. The existing reviewed dependency exception is retained. No current local check is failing.

- Shared parser/consumer tests include exact source round-trip, mixed/Unicode fractions, uncertainty, forms, optional alternatives, oil-grade separation, known AU versus unknown measures, source collision, provider tampering, distinct preparation and cache revisions.
- Real PostgreSQL tests `0038`/`0039`/`0040` cover protected preview/enqueue, source collision/private exclusion, batch idempotency/pause, retained old results, stale rules, structure-source integrity, atomic Shopping refresh, bought/manual/override preservation, stale source and unrelated/inactive denial.
- Real local repository/PostgREST harness covers legacy list refresh, no resurrection, repeated override preservation, fraction repair, unchanged source recipes, household/private/public create/read/edit boundaries. These are synthetic JWT/API checks, not hosted sign-in evidence.
- Playwright covers compact amounts, Edit, bought state and explicit refresh at 320px and desktop/mobile Chromium; axe checks the affected fixtures. A new status message was initially hidden by existing header CSS; it was moved outside that rule and the affected checks rerun. Early test-fixture selector errors and a SQL fixture table-name typo were corrected without weakening assertions.
- Exact-head CI results are recorded on the draft PR after publication; local evidence does not substitute for those checks. Physical Safari, VoiceOver and authenticated hosted provider generation are not claimed.

## Review and hosted acceptance

On the exact approved preview with synthetic access, import/save a recipe, plan it, inspect clean amounts and original preparation, mark a purchase bought, edit another, remove a third and refresh twice. Confirm no duplicate or resurrected purchase and correct private/public source isolation. Inspect Admin source counts without starting paid processing. In separately authorised staging, activate a validated current result, verify Get Ahead source details and cache replacement, then verify honest unavailable/preparing behaviour with failed/disabled intelligence.

The default Vercel preview may be SSO-protected; a public redirect/health response does not prove any authenticated journey. Hosted acceptance needs designated disposable access. No production data or email was used.

## Boundaries, risk and operation

ADR013 remains authoritative: no deterministic fallback checklist. Existing owner-only private imports get shared parsing/Shopping support but no new Get Ahead enrichment authority; CS-93 currently covers household recipes and public imports. This narrower existing source boundary is explicitly disclosed for review instead of silently using service-role access or publishing private content.

Unknown preparation language, absent note bodies, unsupported density or ambiguous measuring convention remain explicit. Safe refresh can leave unmatched lines for review. Mixed bought/unbought rows become unbought when merged. Existing provider storage/safety validation remains required; no paid evaluation was run.

A$0 fixed monthly/yearly cost and no new provider. A later operator-approved batch can consume existing enabled-AI budget, which the confirmation states. No feature enablement, production backfill, merge or deploy occurred. Production requires separate exact-SHA approval, backup/history/dry-run and the protected Production database release workflow after merge, followed by coordinated Edge Function/app release. Pause the worker for the compatibility window. Rollback/forward-fix instructions preserve original sources and prior enrichment results; released migrations are immutable.

## Final integration and release decision

Only package/build work is authorised. Worker pause/resume, migrations, Edge Function/app deployment, feature enablement, production reprocessing and paid generation require later approval. Do not treat the proposed sequence as approval.

Jira AC2 literally promises usable deterministic fallback for both consumers. That is **not met for Get Ahead** under accepted ADR013: preserve honest preparing/unavailable rather than invent a checklist. On 2026-10-05 the owner accepted temporary Get Ahead preparing/unavailable during this pre-MVP v4 transition: “As long as we keep building at pace I’m happy to have it unavailable”. For this transition, AC2 means Shopping remains usable through deterministic parsing while Get Ahead reports its state honestly; it does not promise a deterministic checklist. ADR013 remains unchanged. No zero-downtime/candidate implementation is required. Owner-only private imports also remain outside existing Get Ahead enrichment authority.

A read-only aggregate Production check on 2026-10-05 found 2 household and 45 shared/public active v3 results, no active v4 results, and 47 eligible sources requiring a v4 queue entry (2 household/45 shared). These are source/result counts, not proof of 47 working household checklists. Deploying the strict v4 consumer would exclude all those v3 results; presently working Get Ahead could become unavailable until validated provider-assisted v4 replacements exist. Retaining old database rows does not provide display continuity. Reprocessing and subsequent uncached weekly generation may incur existing provider usage; no paid calls were made. Temporary Get Ahead downtime is now accepted; it is no longer a code-review or continuity-design blocker. Merge, deployment, production backfill and paid processing still require separate owner action/approval. Follow the owner-operated checklist in the reprocessing runbook. Hosted checks are post-release acceptance before calling Get Ahead/beta complete, not a requirement to add speculative transition code.

Explicit metric package multiplication now supports positive integer counts with positive decimal g/kg/ml/l sizes, such as `2 x 400 g cans tomatoes` and `3×250ml cartons coconut milk`. Structured evidence retains count, size, original unit spelling/expression, package-form wording and exact source. Arithmetic does not infer drained weight or density; ranges, non-metric/unknown sizes, parenthetical package syntax, approximate quantities and drained/net/gross qualifiers remain unresolved. Package form synonyms are not automatically equated. Consumer tests verify matching packaged forms combine while fresh products remain distinct.

The integrated validation caught and fixed a missing legacy display-helper export, three superseded PR187 domain expectations, and the numeric quantity-column boundary for package expressions. Package metadata keeps the source expression while the legacy quantity field stores its exact numeric total. Two real local save/read/generation checks cover that persistence boundary.
