# Engineering Package — CS-101: Lossless shared ingredient structure

## Metadata

- **Jira issue:** [CS-101](https://smillins.atlassian.net/browse/CS-101)
- **Status:** Ready for review; hosted/manual acceptance pending
- **Branch:** `feat/cs-101-shared-ingredient-structure`
- **Verified baseline:** main `8592a4ff454aa3ced94106c7aabce48607d24a88`
- **Builds on:** CS-28/CS-30, CS-90, CS-93, CS-79 and CS-81/CS-91
- **Integrated main:** `eb498acd57cef00f5ce9da3821238ba69a945471` (PR187 already merged remotely).

## Approved outcome

Use one versioned, lossless ingredient structure for import/manual saves, Shopping and preparation intelligence. Reduce household interpretation work without changing the approved recipe, choosing substitutions, inventing measures or collapsing meaningful preparation/product distinctions. Plain olive oil and extra virgin olive oil remain distinct by explicit owner decision.

## Verified root causes

The common `recipe-content-v1` derivation always stores null preparation, leaves annotation wording in product names, omits handful measures and misreads mixed fractions. Shopping reparses some legacy lines independently; Recipe Intelligence uses the contaminated names and empty preparation fields. Shopping does not consume active provider-derived canonical ingredients. Existing source text and immutable enrichment snapshots provide recovery inputs, but an app deployment does not refresh stored lists or active insight versions by itself.

## Implementation contract

- A deterministic shared ingredient module separates product/material qualifiers, quantity text/value/state/unit, preparation detail and purpose, optional alternatives, note references and exact source text. It records schema/rules/parser identity and source/convention provenance.
- Preserve allergy/dietary qualifiers, dried/canned/packed form, oil grades and meaningful cuts. Unknown or ambiguous fields remain explicit. Optional alternatives do not create purchases. A note reference is not its unavailable note body.
- Use the same module for new saves/imports, legacy stored recipe adapters, Shopping and deterministic Recipe Intelligence. Provider output cannot erase source distinctions or introduce unapproved purchasing identities. Reuse current validated intelligence and safe fallback boundaries.
- Version reprocessing through the protected CS-93 path, with preview/counts, bounded idempotent batches, pause/resume/retry and stale-source rejection. Preserve previous valid results until replacement validation/activation; do not automatically execute production backfill.
- Refresh affected derived shopping contributions using the existing atomic reconciliation path, preserving bought state, manual records, explicit overrides and tenant isolation. Stable source references and repeated refresh must not duplicate contributions.
- Advance insight/parser identities and invalidate affected Get Ahead caches through existing source-version/current-result paths. No stale saved checklist may be presented as current.
- Reuse verified publisher conventions and explicit recipe settings. Do not guess from locale/domain suffix or infer unsupported densities. Add no main-list measuring controls or substitution UI; the explicit compatibility refresh is a single header action.
- Retain PR187's compact amount-first presentation in the eventual integrated result, but this branch starts from current main and must work independently. Document overlapping-file integration and test the combined tree before handover when feasible.

## Existing architecture boundaries

Accepted ADR013 governs Get Ahead: deterministic source parsing remains available, but missing/failed intelligence shows preparing/unavailable rather than a fallback checklist. Current CS-93 covers private household recipes and public imports; owner-only private imports receive shared parsing and Shopping support without expanding service-role enrichment authority. These limitations are explicit in the runbook and draft PR; no private source is published or silently broadened.

## Generalisation (AC9–10)

One reusable preparation grammar applies to unseen core ingredient names. Cross-consumer tests cover fresh garlic, onion, tomato, avocado, kohlrabi and radicchio; parser tests add tarragon, cavolo nero and oyster mushrooms. Sliced/crushed/diced products combine compatible purchases while preserving separate Get Ahead preparation. Explicit purchased forms and ambiguous processed descriptions remain distinct. Optional alternatives never become required purchases.

## Acceptance and tests

- [x] Exact original-text preservation and typed separation for the supplied oil, sugar/substitution, note-reference, tomatoes-in-oil, handfuls, diced tomato and mashed avocado cases.
- [x] Mixed/Unicode fractions, ranges, unknown amounts, preparation precision, dietary qualifiers and packaging forms remain honest.
- [x] Import/manual create/edit and existing household/public/private recipe representations use compatible semantics and stable source references.
- [x] Known AU olive-oil measures total 120 mL for 3 tbsp + 60 mL; unknown measures remain explicit; generic olive oil remains separate.
- [x] Brown sugar variants share purchasing identity without adding honey or guessing mass/volume conversion.
- [x] Reprocessing is bounded, repeatable, source-separated and rejects stale workers; active validated replacement and cache invalidation are tested.
- [x] Existing-list refresh preserves bought state, deliberate overrides, manual items and contribution counts across retries and edits.
- [x] Real PostgreSQL RLS covers authorised household/private owner/public-admin and unrelated/inactive/anonymous actors, including source-ID substitution.
- [ ] Exact-head CI and hosted/manual release acceptance recorded separately; local static, database, API and browser evidence is in the handover.
- [x] Hosted authenticated/manual limitations, migrations, Edge Functions, source coverage and operational release sequence are explicit in handover.

## Release and operation boundaries

No merge, production deployment, production backfill, paid provider evaluation, feature enablement or Jira edits are authorised in this task. Implement and test machinery using synthetic local data and contract fakes only. New migrations are forward-only and additive; released migrations remain immutable. Production requires separate exact-SHA approval, backup/dry-run/history verification and the protected release workflows. No new provider or recurring fee; A$0 fixed monthly/annual cost, existing provider usage remains separately controlled. Rollback retains original recipes and old immutable results; derived metadata uses a versioned forward fix.

## Delivery references

- [ADR015](../../docs/architecture/decisions/015-shared-lossless-ingredient-structure.md)
- [Operator runbook](../../docs/engineering/v2/ingredient-structure-reprocessing.md)
- [Handover](../../docs/engineering/handovers/cs101-shared-ingredient-structure.md)

PR187 was merged remotely at 2026-10-05 03:10 UTC as `eb498acd57cef00f5ce9da3821238ba69a945471`. This accepted main was merged into the CS-101 branch without rewriting history. Its ShoppingPage amount-first/combined-measure Edit and styles remain intact; only the CS-101 refresh action/status is added to that UI. All PR187 browser/component assertions remain, with the recipe-amount text check made exact to distinguish the new button. The central parser replaces its bounded display cleanup. PR188 targets main independently; no open-PR merge ordering remains. This executor did not merge or close PR187.

## Final integration and release decision

Only package/build work is authorised. Worker pause/resume, migrations, Edge Function/app deployment, feature enablement, production reprocessing and paid generation require later approval. Do not treat the proposed sequence as approval.

Jira AC2 literally promises usable deterministic fallback for both consumers. That is **not met for Get Ahead** under accepted ADR013: preserve honest preparing/unavailable rather than invent a checklist. Owner acceptance of this discrepancy is outstanding. Owner-only private imports also remain outside existing Get Ahead enrichment authority.

A read-only aggregate Production check on 2026-10-05 found 2 household and 45 shared/public active v3 results, no active v4 results, and 47 eligible sources requiring a v4 queue entry (2 household/45 shared). These are source/result counts, not proof of 47 working household checklists. Deploying the strict v4 consumer would exclude all those v3 results; presently working Get Ahead could become unavailable until validated provider-assisted v4 replacements exist. Retaining old database rows does not provide display continuity. Reprocessing and subsequent uncached weekly generation may incur existing provider usage; no paid calls were made. **Hold deployment** pending owner acceptance, a separately authorised transition/coverage plan and authenticated hosted acceptance.

Explicit metric package multiplication now supports positive integer counts with positive decimal g/kg/ml/l sizes, such as `2 x 400 g cans tomatoes` and `3×250ml cartons coconut milk`. Structured evidence retains count, size, original unit spelling/expression, package-form wording and exact source. Arithmetic does not infer drained weight or density; ranges, non-metric/unknown sizes, parenthetical package syntax, approximate quantities and drained/net/gross qualifiers remain unresolved. Package form synonyms are not automatically equated. Consumer tests verify matching packaged forms combine while fresh products remain distinct.
