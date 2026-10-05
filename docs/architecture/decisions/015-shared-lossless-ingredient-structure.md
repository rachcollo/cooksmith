# ADR 015: Share lossless ingredient structure across recipe consumers

- **Status:** Proposed
- **Date:** 2026-10-05
- **Package:** [CS-101](../../../engineering/ready/cs101-shared-ingredient-structure.md)

## Context

Ingredient annotations and preparation were stored as product names, with null preparation. Mixed fractions could be split incorrectly. Independent downstream parsers could then disagree about shopping products and preparation work. Existing recipes, purchases and enrichment results outlive an application release.

## Decision

Use the framework-independent `ingredientStructure` module as the deterministic source projection for import/manual ingestion, stored recipe adapters, Shopping and Recipe Intelligence. Keep exact ingredient lines and approved recipe text. Record schema/rules/parser versions, canonical purchase identity, original quantity text and known/range/approximate/unknown values, unit, preparation, purpose, alternatives, note references and unresolved ambiguity separately.

Preparation grammar applies to arbitrary products, not a food whitelist. Explicit packaged/processed forms and ambiguous product descriptions remain conservative. Garlic sliced/crushed/diced groups for purchasing, with distinct preparation evidence. Garlic powder, jarred paste, dried/fresh qualifiers and olive-oil grades remain distinct. Supported numeric parsing is not permission to infer a density or measuring convention.

New household ingredient rows store the projection in `ingredient_structure`; imported rows carry the same metadata in their existing JSON. Legacy rows are re-derived in read adapters without changing stored originals or source IDs. Provider suggestions may improve preparation opportunities and step links but cannot replace the validated source structure. Recipe Intelligence results retain source-kind/version and measuring-convention provenance. Shopping contributions retain source recipe kind/ID/version, ingredient ID, original text, conversion provenance and legacy aliases.

Advance Recipe Intelligence rules to v4. Extend the protected CS-93 queue with bounded `reprocess_structure` and separate household/public preview counts. No backfill runs on migration. Previous valid results remain until replacement activation; stale rules cannot supersede current results. Snapshot timestamps distinguish multiple row-trigger snapshots within a save, and source update versions participate in fingerprints. Get Ahead candidates include enrichment ID/activation time in cache identity and consume the same source preparation/quantity. ADR013 still forbids user-visible deterministic fallback checklists.

Existing Shopping lists refresh through an explicit household action. Only surviving source contributions that match the current recipe are eligible. Current contributions are skipped so repeated batches progress. An atomic invoker RPC verifies active membership, source kind, recipe version and the expected contribution set under locks, then reuses the existing reconciliation function. Legacy aliases preserve explicit overrides. Bought state survives reprojection; merging bought and unbought products yields an unbought result. Manual records remain untouched. Missing/edited/ambiguous sources are reported, not guessed; removed purchases are not recreated.

## Alternatives

- Per-food display replacements: cannot generalise or repair quantities/preparation.
- Provider canonical names as unqualified purchase identities: could erase product grades, source ambiguity or dietary/form distinctions.
- Rewrite all existing recipes/lists during migration: loses reviewability and risks user adjustments.
- Rebuild every planned meal when opening Shopping: can resurrect removed purchases and silently change scope.

## Consequences and limitations

The grammar is bounded, not universal natural-language understanding. Unknown wording remains source-backed and separate. Note bodies absent from the import are not invented. Existing owner-only private imports receive shared parsing and Shopping behaviour but remain outside the current Get Ahead enrichment authority (household recipes and public imports). This ADR does not publish private recipes or expand provider authority. The operator runbook makes that limitation explicit.

## Security, migration and cost

Two additive forward migrations; no new RLS bypass or provider. The refresh RPC is invoker-only with explicit household checks, safe search path and anonymous execution revoked. The admin queue retains existing protected authority. Source collisions and stale snapshots have regression tests. No production mutation or provider execution is part of implementation validation. Fixed cost: A$0/month and A$0/year; any later AI reprocessing uses separately approved existing limits.

## Product Principles supported

Reduce interpretation work while preserving household control, reliable source information, calm mobile presentation and honest uncertainty.
