# ADR 001: Build Cooksmith v2 in the existing repository

- **Status:** Accepted
- **Date:** 2026-07-13

## Context

The current Cooksmith MVP already has source control, deployment connections and a working prototype. Cooksmith v2 needs isolation from production without duplicating repository administration.

## Decision

Build Cooksmith v2 in `rachcollo/cooksmith`.

## Options considered

- **Existing repository:** Accepted. It retains useful delivery infrastructure and history.
- **New repository:** Rejected. It would duplicate administration without improving the target architecture.

## Consequences

The prototype and v2 share history and repository governance. Branch isolation and disciplined pull-request targets are required to protect production.

## Cost impact

A$0 recurring cost.

## Product Principles supported

Principles 1, 2 and 8 by reducing setup work and keeping delivery understandable.

## Rollback or reconsideration trigger

Reconsider if repository permissions, deployment coupling or release history prevent safe independent v2 delivery. A new repository can then be created from the accepted v2 history.
