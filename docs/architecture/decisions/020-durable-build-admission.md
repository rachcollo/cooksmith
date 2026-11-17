# ADR 020: Durable build admission

- **Status:** Proposed
- **Date:** 2026-11-17

## Context

PR-only counting cannot reserve a build before its PR exists or prevent overlapping
scheduled sessions from exceeding the authorised three-build cap.

## Decision

Use atomic creation of one fixed GitHub tag ref as an admission mutex and separate
immutable per-story tag refs as durable reservations. No expiry is inferred from
age. Require explicit reviewed scope metadata and fresh Jira evidence for parallel
admission; absent evidence serialises. See [runbook](../../operations/BUILD_ADMISSION.md).
This proposal implements the owner's authorised repair; merge and activation remain
separate reviewed actions.

## Alternatives

Jira comments and client-side expected-SHA checks do not provide the required atomic
admission. A new lock service would add a provider and operational cost. Serial-only
admission would be safe but would not support explicitly verified independent work.

## Consequences

Every worker must participate. Interrupted writes deliberately require operator
reconciliation after stopping all owners. Claims stay through review and release
verification. Existing unverified branches can block pickup and require review.

## Security impact

The runner needs GitHub Contents write for tag/ref operations, plus existing Jira
read access. No new credentials are created by this change. Production permissions,
branch protections and human merge/release gates remain intact. Live-owner recovery
is forbidden because ref deletion is not compare-and-delete.

## Cost impact

A$0 monthly and A$0 annual additional provider/dependency cost. Existing agent and
CI usage may increase within the authorised cap; no tier or provider changes.

## Migration impact

No application or database migration. Pause old workers, reconcile current work,
configure the runner and update the actual scheduled prompt before activation.
No package receives concurrency metadata automatically.

## Product Principles supported

Protect household trust and keep delivery dependable: overlapping implementation
cannot silently bypass scope/dependency gates or consume unbounded build capacity.
There is no product behaviour change.

## Rollback or reconsideration trigger

Pause admission if owner liveness or registry completeness cannot be established.
Retain outstanding claims during rollback. Reconsider this design if manual recovery
or retained branch reconciliation prevents practical operation.
