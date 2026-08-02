# ADR 012: Use recipe-level preparation intelligence for Get Ahead

- **Status:** Accepted
- **Date:** 2026-08-02

## Context

Get Ahead previously built its weekly candidates from per-ingredient action labels. Complete recipe
instructions were available to the enrichment provider, but the stored contract contained no
recipe-level make-ahead opportunities. Real household plans therefore had too few candidates for
the weekly model to select, even when the recipes contained useful vegetable preparation,
marinades, sauces or advance components.

## Decision

Recipe Intelligence v2 stores source-linked recipe-level preparation opportunities derived from
the complete ingredient list and instructions. Each opportunity contains concise preparation
metadata, source ingredient and step references, average-cook effort, likely weeknight saving,
maximum lead time and separation boundaries. The weekly planner selects and groups only these
validated opportunities.

Maximum lead time remains internal eligibility metadata. Cooksmith does not show “use within”
deadlines or similar food-storage suggestions in the checklist. Raw-protein preparation remains
eligible and is kept separate from vegetables and ready-to-eat work.

## Alternatives

- **Continue deriving candidates from ingredient actions:** Rejected because it cannot identify
  recipe-level work and produced demonstrably sparse household plans.
- **Send full recipes directly to the weekly model on every request:** Rejected because it repeats
  extraction, increases variable cost and weakens reusable source traceability.
- **Store recipe-level opportunities during enrichment:** Accepted because it creates one reusable,
  validated contract for planning and future consumers.

## Consequences

Existing recipes require v2 re-enrichment before they are ready for Get Ahead. Weekly evaluation
and activation identities must advance with the contract. The enrichment provider performs more
structured reasoning per recipe, but weekly planning receives better candidates without repeated
full-recipe extraction.

## Security impact

The existing provider and persistence trust boundaries are unchanged. Opportunities may reference
only supplied ingredient and step IDs, and application validation rejects invented references,
duplicate identities and invalid estimates. No recipe text is added to operational logs.

## Cost impact

Fixed cost remains A$0 per month and A$0 per year. Re-enriching existing recipes creates bounded
usage through the already approved provider and existing cost controls. Ongoing weekly calls avoid
resending complete recipes.

## Migration impact

A forward migration advances recipe-enrichment defaults, queues the latest recipe versions for v2
provider enrichment, disables weekly AI and advances planner, prompt and corpus identities. Old
enrichments remain immutable and inactive after a valid v2 result is activated. Rollback uses the
existing emergency stop and forward fixes rather than editing released migrations.

## Product Principles supported

Principles 1, 2, 3, 4, 5 and 10. The decision removes household planning effort, makes AI output
materially useful and keeps source traceability, cost controls and deterministic eligibility
checks.

## Rollback or reconsideration trigger

Reconsider if hosted evaluation or real household sessions show that v2 opportunities do not cover
at least two eligible meals in representative multi-meal plans, or if enrichment cost materially
exceeds the approved operating limit.
