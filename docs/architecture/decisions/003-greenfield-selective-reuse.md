# ADR 003: Use greenfield architecture with selective reuse

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

The MVP validates the product direction but contains prototype schema, persistence and application patterns that should not constrain v2.

## Decision

Design the v2 target architecture from the authoritative product documents. Reuse existing code only when it meets target architecture, accessibility, testing, security and user-experience requirements.

## Options considered

- **Greenfield target with selective reuse:** Accepted. It retains proven assets without preserving prototype constraints.
- **Incremental in-place refactor:** Rejected. It risks carrying unsafe persistence and unsuitable domain assumptions forward.
- **Discard all existing work:** Rejected. Useful platform, brand and interaction foundations already exist.

## Consequences

Reuse must be justified component by component. Some familiar code and schema will be replaced, while production behaviour remains untouched until an approved release.

## Cost impact

No direct recurring cost. It may increase initial implementation effort while reducing later rework and operational risk.

## Product Principles supported

All ten principles by allowing the product outcome, safety and calm experience to govern implementation.

## Rollback or reconsideration trigger

Reconsider individual reuse decisions when evidence shows replacement costs more than it improves safety, maintainability or user effort. Record material changes in a new ADR.
