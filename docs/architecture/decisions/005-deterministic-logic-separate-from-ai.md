# ADR 005: Keep deterministic logic separate from AI

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

Cooksmith needs trustworthy calculations and safety constraints while using AI to reduce planning effort.

## Decision

Use deterministic code and database rules for dates, quantities, permissions, budgets, dietary and allergy exclusions, shopping calculations and hard-constraint validation. AI may propose, rank, extract and explain through structured outputs, subject to validation and useful deterministic fallbacks.

## Options considered

- **Separate deterministic rules and AI proposals:** Accepted. It protects safety, predictability and availability.
- **Allow AI to own calculations and constraints:** Rejected. Outputs are variable and unsuitable as the final authority.

## Consequences

AI operations require schemas, server-side validation, evaluation cases, confirmation rules and fallback behaviour. Some logic must exist independently of the AI path.

## Cost impact

Reduces variable provider cost by avoiding unnecessary AI calls. Any AI provider cost still requires the applicable approval.

## Product Principles supported

Principles 1, 2, 3, 4, 5 and 10 by making AI quiet, useful and safely replaceable.

## Rollback or reconsideration trigger

This safety boundary is not removed by a provider change. Reconsider the allocation of a specific operation only when evaluation evidence shows it is safe, more useful and cheaper, with an approved replacement ADR.
