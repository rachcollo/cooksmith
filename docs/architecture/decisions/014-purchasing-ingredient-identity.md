# ADR 014: Shared purchasing ingredient identity

- Status: Proposed
- Date: 2026-10-04
- Work package: [CS-79](../../../engineering/ready/cs79-shopping-ingredient-normalisation.md)

## Context

Recipe preparation names currently become separate shopping products. Pantry aliases can also create duplicate household records. Combining all similarly named ingredients or incompatible quantities would undermine trust.

## Decision

Use a deterministic v1 purchasing identity shared by the TypeScript shopping normaliser, Pantry validation/matching and immutable PostgreSQL functions. Keep a small explicit plural and Australian synonym dictionary. Ignore prep words for a conservative produce whitelist, while preserving variety, dietary and packaged-form qualifiers. Diced tomatoes remain distinct because the phrase commonly describes a packaged product. Quantity-bearing free text is not parsed into an assumed product.

Generated shopping identity is household + product + compatible unit. Convert only metric scales and explicit count aliases. Retain original names and amounts on each planned-meal contribution for display and exact reconciliation. Keep manual shopping rows separate. Upsert contributions before deleting obsolete ones so equivalent regeneration preserves bought state. Composite foreign keys bind both contribution references to its household; existing RLS still applies.

Pantry uses the same product identity, independent of quantity units. Reject new aliases while allowing existing records to be reviewed and edited. Do not merge or delete existing Pantry data automatically. Availability matching remains distinct from receiving bought items: the CS-98 put-away workflow must restore unavailable items and provide durable receipt idempotency.

Recipe source ingredients and Get Ahead preparation grouping are unchanged. Purchasing identity must never collapse preparation tasks.

## Migration and compatibility

Backfill generated shopping rows from their contribution records, retaining raw source amounts and splitting legacy incompatible units. All-bought groups remain bought; mixed groups become unbought. Generated row IDs may change once during migration. Preserve manual rows, orphan generated rows (as manual) and all Pantry records. Apply the migration before serving application code that selects the new provenance column. Released v1 semantics must not change in place: evolve through an explicit new version and reviewed migration.

## Consequences

The TypeScript and SQL contracts need shared corpus evidence. False negatives are preferable to unsafe merges. No provider or recurring cost is introduced. Migration release needs a backup, exact-SHA dry run and authenticated shopping/household verification. Roll back application code only to a compatible schema consumer; forward-fix released database migrations.

## CS-79 purchase-total follow-up (2026-10-04)

The live review showed that one record per unit is not one useful purchase row. The Shopping presentation now groups household records by product, with one checkbox and edit/remove action. The recipe-amount disclosure is removed; original names and amounts stay on contributions internally. Mixed units appear concisely on the same product, for example `60 ml + 3 tbsp`. Manual and generated records can share a presentation row without deleting their underlying records.

Shopping uses a separate purchasing projection for older text/derived ingredient lines, mixed and Unicode fractions, conservative produce preparation wording and trailing usage notes. This does not rewrite recipes, the Pantry v1 contract or Get Ahead tasks. `to taste` remains a note, never a numeric zero. If unspecified sea salt coexists with explicitly requested flakes and no fine/coarse sea salt, Shopping chooses flakes for that purchase. Explicit fine/coarse forms remain distinct; no salt density is inferred.

Use metric teaspoons at 5 mL and existing exact metric scale conversions. Imported recipes do not record a regional tablespoon/cup standard, so retain those units explicitly. No weight/volume density conversions are introduced. See the [Taste publisher measurement chart](https://www.taste.com.au/images/common/Taste-Weights-Measurements-A3-V4.pdf) for the metric teaspoon convention and Australian tablespoon distinction. New SQL v2 purchase-unit helpers leave released v1 functions unchanged.

Grouped mutations use household-scoped atomic invoker RPCs with RLS and an advisory lock. Editing a combined amount distributes that override across existing records (one amount and zero on other records of the same unit), preserving contribution links. `plan_override` exempts those protected records from the ordinary manual-name uniqueness index. Regeneration recognises retained source identities and avoids re-adding the same requirement beside its override. Equivalent totals retain bought state, including legacy tsp/mL consolidation; increased generated requirements become outstanding. Recipe edits refresh linked planned contributions without provider calls in the shopping adapter.

Migration `20261004115348_shopping_purchase_groups.sql` preserves existing IDs and quantities and identifies existing source-linked manual adjustments. Apply it before the application uses the new RPCs. Quantity adjustments remain deliberate household overrides when later recipe requirements change. Reverting application code does not remove the additive column/functions; released migrations require forward fixes.
