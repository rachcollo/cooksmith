# ADR 002: Use a dedicated v2 integration branch

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

The production MVP must remain stable while v2 is delivered milestone by milestone.

## Decision

Use `v2` as the integration branch. Create each milestone branch from the latest accepted `v2` and target its pull request to `v2`. Merge to `main` only at an approved release checkpoint.

## Options considered

- **Dedicated `v2` branch:** Accepted. It isolates integration and supports a stable preview.
- **Milestone branches targeting `main`:** Rejected. It risks changing production before v2 is accepted.

## Consequences

`v2` needs its own review discipline and may need updates from `main` when production fixes occur. Milestone handovers must state their base and target.

## Cost impact

A$0 recurring cost.

## Product Principles supported

Principles 1, 2 and 8 by making delivery safer and easier to review.

## Rollback or reconsideration trigger

Delete an unmerged milestone branch to roll back its work. Reconsider the integration strategy after the approved v2 release has replaced the MVP.
