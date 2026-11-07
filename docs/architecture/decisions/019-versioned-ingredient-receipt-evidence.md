# ADR 019: Version ingredient rules while preserving purchase evidence

- **Status:** Proposed
- **Date:** 2026-11-07

## Context

Put-away was showing every known Pantry item and carrying recipe commentary into product names. Compact and equivalent measurements could remain embedded in labels. Improving the shared parser must not invalidate existing source-bound recipe intelligence or turn recipe requirements into invented stock.

## Decision

Use deterministic ingredient structure rules v2 within the existing v1 structure schema. Keep original text, alternate source measures, notes, optionality and unresolved product choices. Prefer an explicitly stated metric equivalent without adding both quantities or assuming density. Shopping uses the shared structure to prepare a measured purchase snapshot; put-away reads that immutable receipt and its current remainder.

Original source text may repair a matching derived product name, but not overwrite a renamed purchase or refill its amount. A single untouched captured purchase label may supply its own explicit exact metric amount when its receipt is unknown. Recipe demand, consumed or revised purchases, unsupported measures, ranges and approximations cannot supply an exact stock delta. Unknown extras remain untracked.

Existing v1 enrichment is checked by reconstructing its frozen v1 structure from the same source. New v2 enrichment is checked against v2. Fingerprints, source references, source context and deterministic structure equality remain mandatory. Keep v1 code immutable and isolated as a validation compatibility module, not a parallel new-data pipeline.

The UI includes safe rows in one batch while showing only actual exceptions by default. Optional review retains correction/exclusion. Existing receipt RPCs remain the atomic authority, including concurrency and idempotency tokens.

## Alternatives

- **Only hide rows:** Rejected because it would silently apply malformed names and discard available measures.
- **Recompute old receipt amounts from recipes:** Rejected because planned demand is not proof of the actual quantity bought or left.
- **Discard all v1 intelligence:** Rejected because an unrelated parser improvement must not disable valid Get Ahead data.
- **Accept old structures without recomputation:** Rejected because a version label cannot bypass source validation.
- **Add a paid model or ingredient catalogue:** Not needed for this scoped deterministic fix; genuinely ambiguous products stay exceptions.

## Consequences

Common purchases require one batch action rather than repeated review. Source punctuation and exact measurements can be used safely. Corrupted legacy names without recoverable evidence, ambiguous substitutes and incompatible units still require attention. No bulk data rewrite or provider re-enrichment is performed. The frozen v1 parser adds bounded compatibility maintenance.

## Security impact

No auth, RLS, grants, provider configuration or trust boundary changes. Optional evidence is parsed at the adapter boundary. Receipt amounts, tokens and current Pantry versions remain authoritative. Regression tests cover source mismatch, stale source, tampering, incompatible measures, corrections and repeated submission. Only synthetic fixtures are committed.

## Cost impact

A$0 per month and A$0 per year. No new dependency or service.

## Migration impact

No SQL or generated-type change. Optional derived fields remain compatible with stored v1 JSON; version-aware validation supports old and new payloads. No production data is accessed or rewritten. Revert the application change before release if needed; preserve receipts.

## Product Principles supported

1 (save time), 2 (reduce mental load), 6 (one tap), 7 (clear next action), 8 (calm screens) and 10 (do not make users think when Cooksmith can safely do it). Trust takes precedence over inventing precise stock.

## Rollback or reconsideration trigger

Revert application changes if source-bound validation, existing purchase editing, duplicate application prevention or product identity regresses. Revisit the compatibility module only after an approved migration proves all relevant v1 payloads have a safe replacement. Review new ambiguity rules with source evidence and regression fixtures, not food-specific guesses.
