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
