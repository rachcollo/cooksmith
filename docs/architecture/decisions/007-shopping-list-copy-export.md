# ADR 007: Use shopping-list copy export before retailer API integration

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

Households need a practical way to use a consolidated Cooksmith list with Coles or Woolworths. Retailer integration would add dependency, complexity and possible cost before the core shopping workflow is validated.

## Decision

Provide one-tap plain-text copy export formatted for use with Coles or Woolworths before considering retailer APIs.

## Options considered

- **Copy export first:** Accepted. It provides immediate utility with low complexity and no external dependency.
- **Retailer API integration first:** Rejected for the friend-test release. It is not required to validate the shopping outcome.

## Consequences

Cooksmith will not initially create retailer baskets or guarantee product matching. Export formatting and shopping aggregation remain deterministic and testable.

## Cost impact

A$0 recurring cost and no new provider.

## Product Principles supported

Principles 1, 2, 4, 6 and 8 by delivering the shortest dependable path to a usable retailer list.

## Rollback or reconsideration trigger

Reconsider retailer integration only after friend testing measures copy export as a material limitation and commercial access, privacy, reliability and cost have been approved.
