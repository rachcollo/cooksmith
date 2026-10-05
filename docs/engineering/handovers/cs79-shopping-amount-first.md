# CS-79: Clear shopping ingredients and explicit measures

## Status and baseline

Implemented, hosted/manual acceptance pending; oil-grade policy and upstream implementation remain undecided. Draft PR187, branch `fix/cs-79-oil-purchase-display`, starts from main `8592a4ff454aa3ced94106c7aabce48607d24a88` (merged PR186). No merge or production release is authorised.

## Outcome and bounded changes

Shopping displays amount before product in one wrapping sentence at 0.9375rem (15px default), retaining 44px controls. The purchase projection removes explicit trailing optional-replacement wording and `see note(s)` references, with or without note numbers, and recognises two unambiguous fresh-preparation phrases for tomato and avocado. It retains original recipe/contribution text, meaningful product forms and optional alternatives internally. It neither selects the substitute nor treats food packed in oil as an oil purchase. Handfuls remain explicit; unquantified frying oil gets no invented amount. Standalone manual names retain the existing manual-row policy.

Storage identity and plan-generation keys stay stable so old source-linked household overrides still match regeneration. Both existing and fresh generated rows receive the display projection. This is an interim Shopping correction, not shared upstream structuring or a Get Ahead improvement.

The combined-purchase editor now exposes the existing convention selector when unresolved tsp/tbsp/cup components exist. The shopper confirms stated sizes for all unresolved components; already projected mL amounts are unchanged. Leaving it unspecified preserves mixed units. The existing atomic RPC stores the explicit purchase override. No schema, migration, generated type, provider, dependency or Edge Function changes. Cost A$0/month and A$0/year. Rollback: revert the application correction; saved deliberate measuring overrides remain supported by the prior schema.

## Root causes and evidence

The parent reviewer obtained and visually inspected the three supplied screenshots after this executor's Library transfers failed, including one bounded retry. Diagnosis uses the parent's confirmed observations, not a claim that this executor viewed those pixels. Screenshots do not reveal recipe origin, stored settings or manual flags; those remain unverified. All repository fixtures are synthetic.

- Annotation words currently enter product identity, so an explicit optional-replacement phrase creates a second shopping purchase. The new projection groups it with the requested product while preserving provenance.
- Oil grades are separate identities by current policy. Units alone do not create another product row. Manual amounts also stay separate unless explicitly included.
- A mixed spoon/mL label means the measuring size has not been resolved for that component. A screenshot cannot establish the publisher convention. The selector supplies a direct, explicit recovery path; it does not guess AU from locale.
- The question mark is the pantry-match hint in `ShoppingPage.tsx`, not an uncertainty indicator. It explains that the pantry might already contain that product.

## Validation and limitations

Nine new regression cases fail against the previous implementation and pass after correction. Final local results: 516 app tests in 75 files; 26 Playwright checks including desktop, Pixel 7, 320px, grouped measure confirmation, editing/completion and axe. Six real local PostgREST/repository checks pass for reload and repeated regeneration of measure overrides and cleaned substitution labels. Preflight, clean dependency installation, formatting, lint, types, build, documentation audit, secret/dependency checks and whitespace checks passed during this correction; exact new-head CI is recorded in the PR.

Initial new-test spelling/canonical-singular mistakes were corrected. The API harness initially attempted a denied recipe-delete cleanup, reused a fixture name, and compared order-sensitive labels; it now archives uniquely named synthetic fixtures and compares unordered components. Final product assertions pass. No production or paid provider calls ran.

Synthetic mobile screenshots were inspected. Agent-browser CLI is unavailable; repository Playwright supplies browser verification. The initial PR preview redirected to Vercel SSO; authenticated hosted acceptance, physical-device and assistive-technology checks remain unperformed. Verify cleaned labels, explicit mixed-measure confirmation and grouped edits in a designated disposable preview household. Public deployment smoke is not functional acceptance.

The complete upstream plan and pending oil-grade choice follow. No direct Jira writes were made; normal repository PR automation runs.

## Upstream ingredient structuring: investigation and proposed scope

The owner's upstream-cleaning proposal is sound, but it is a separate shared-data change, not completed by these display rules.

### Current implementation

- `supabase/functions/import-recipe/extractor.ts` reads JSON-LD `recipeIngredient` strings and instruction steps into multiline text. It preserves the source URL but has no field or extraction path for the actual numbered recipe-note bodies. A `see note` reference can therefore survive without the referenced note being imported. Do not invent that note's contents.
- `src/domain/recipes/contentDerivation.ts` (`recipe-content-v1`) splits a leading quantity and recognised unit from a line. Every branch assigns `preparation: null`; remaining substitutions, preparation phrases and note references become part of `name`. Handful is not a recognised unit. This parser's fraction alternative order also differs from the corrected shopping parser; one shared lossless parser should replace the divergent interpretations.
- `src/infrastructure/recipes/supabaseRecipeRepository.ts` calls this same derivation when saving household recipes and imported recipes. Household rows are relational children; imports store `ingredient_rows` JSON. Both retain `original_line_text`, parser version and derivation status. Fixing only the URL extractor would miss manual recipes, edits and existing imports.
- `src/domain/recipes/intelligence.ts` already models canonical name, original text, aliases/modifiers, quantity state/unit/dimension, action, preparation detail, source-step IDs and confidence. Its deterministic builder currently normalises the whole ingredient name and derives actions from `ingredient.preparation`; it does not split annotation text out of a contaminated name. The provider may enrich these facts later, but optional substitutions and note references have no explicit typed slots. Regional measuring conventions also need an explicit shared provenance contract rather than divergent assumptions.
- Shopping generation consumes recipe rows (`planGeneration.ts`), not active enriched canonical ingredients. A better enrichment result alone therefore does not automatically clean Shopping.
- The legacy preparation-opportunity path requires `ingredient.preparation`; an empty field produces no ingredient-preparation opportunity (steps may still produce opportunities). The current weekly Get Ahead endpoint consumes validated active recipe enrichment's `preparationOpportunities`, with source-version references, not Shopping labels. Consequently this PR does not improve Get Ahead intelligence and must not claim to.
- Get Ahead cache keys include recipe version, enrichment schema/rules version, preparation detail and other candidate facts (`weeklyPreparationPlan.ts`). The worker checks current recipe version before activation; the reprocessed-activation migration deactivates the prior result before activating a validated replacement. A parser change without reprocessing/version changes will not reliably refresh old insights.

### Recommended follow-up

1. Introduce one versioned, lossless ingredient structuring contract used by save/import, deterministic enrichment and Shopping's purchasing adapter. Separate requested product and material form; quantity/unit and source measuring convention; preparation action/detail; optional alternatives; numbered note references; and untouched original text with stable source IDs. Unsupported phrases remain explicitly unresolved. Preserve allergy/dietary qualifiers, fresh/dried/canned form, packing qualifiers and meaningful cut size.
2. Reuse the existing ingredient/enrichment models rather than creating an unrelated cleanup service. Extend typed derived metadata for alternatives and note references, and version both parser/rules and schema where needed. Shopping consumes product/measure fields; Get Ahead consumes preparation/actions and source-linked instructions. A substitution is an option, not a second required ingredient or an automatic replacement.
3. Keep the approved recipe text unchanged. At import review show the parsed result with a low-friction correction route; request input only for consequential ambiguity such as unresolved measures or substitutions. Capture source note bodies when reliably available and linked; otherwise retain an unresolved reference accessible from the recipe.
4. Cover existing data explicitly: dry-run deterministic re-derivation from saved original lines/snapshots, stable source IDs, difference report, idempotent/resumable batches, and no deletion of user-approved edits. Rebuild derived metadata rather than scraping/rewriting every recipe. Reuse authorised CS-93 backfill mechanics for household/public sources; private imports require their own owner-safe path because the existing enrichment contract intentionally excludes them.
5. Reprocess affected Recipe Intelligence with new parser/rules identity, reject stale activation, and invalidate/regenerate affected weekly candidates/cache. Reconcile shopping contributions while preserving bought state, explicit overrides and meal provenance. A deployment alone is not a backfill. Provider reprocessing/evaluations and production backfill require separate cost/release approval; no such work ran here.
6. Verify new import, manual save/edit and old-data reprocessing with the same synthetic corpus: mixed fractions, handfuls, precise cuts, substitutions, unresolved notes, dried tomatoes packed in oil, dietary qualifiers, unknown measuring systems and shared/private ownership. Assert source preservation, correct Shopping projection, retained Get Ahead prep detail, repeat-run idempotency, stale-worker rejection and cache refresh. Use deterministic/provider-contract fixtures before any paid evaluation.

### Existing story coverage and decision

Repository packages already cover the foundations: CS-28/CS-30 lossless structuring/import, CS-90 shared Recipe Intelligence, CS-93 shared-source backfill, CS-91 weekly integration, and CS-94 Get Ahead validation/recovery. CS-79 covers the bounded shopping projection. None of the inspected packages explicitly delivers the complete cross-consumer separation of optional alternatives and note references plus private-import refresh described above. Their checked-in status labels are historical documentation, not a live Jira status assertion.

Recommend a focused follow-up package extending those foundations, with scope approved before schema/parser/worker changes. This investigation does not create or change Jira stories or authorise production reprocessing.

For generic olive oil versus extra virgin: recommend a low-friction **explicit purchase substitution choice** when both are already listed, retaining distinct provenance. Automatically choosing extra virgin is a product policy change; it is not mere spelling normalisation. Generic frying oil, explicitly refined/light/virgin grades, sprays, infused/blended oils and ingredients packed in oil remain distinct. The choice and upstream implementation are pending; this PR does not silently merge oil grades.
