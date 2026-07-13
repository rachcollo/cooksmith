# ADR 006: Use fortnight planning rather than week-only planning

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

The product outcome is to help a household organise two weeks of dinners in one calm planning session. The prototype supports weekdays only and cannot represent rolling real dates reliably.

## Decision

Make a real-date fortnight the primary planning period. The planner may provide focused views, but its underlying plan is not limited to one week.

## Options considered

- **Fortnight planning:** Accepted. It matches household shopping and planning habits defined by the product.
- **Week-only planning:** Rejected. It requires more frequent planning and does not meet the friend-test outcome.

## Consequences

Dates, navigation, generation, shopping and preparation must operate across a rolling fortnight. Mobile design must keep the longer period calm and manageable.

## Cost impact

A$0 recurring cost.

## Product Principles supported

Principles 1, 2, 6, 7, 8 and 9 by reducing planning frequency and presenting a complete starting point.

## Rollback or reconsideration trigger

Reconsider the default presentation if friend testing shows a fortnight is consistently confusing or slower than 15 minutes. Preserve the date-based model even if the view changes.
