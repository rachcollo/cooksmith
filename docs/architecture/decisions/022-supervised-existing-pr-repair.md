# ADR 022: Supervised serial existing-PR repair

- **Status:** Proposed; operative only after human acceptance and merge
- **Date:** 2026-11-19

## Context

The owner accepts residual concurrent-worker risk to repair selected existing PRs.
Exhaustive old-worker cessation and the atomic command's secure runtime could not
be established. Reverting the recovery commits would restore legacy occupancy
blocking all admission. A 20 November beta goal does not authorise skipping gates.

## Decision

Add a narrow manual operating-policy exception, documented in the
[runbook](../../operations/BUILD_ADMISSION.md#supervised-serial-existing-pr-repair).
A supervisor selects one bounded existing-PR repair and records exact head/main,
current evidence, dependencies and unresolved ownership risk. This exception waives
historical occupancy, exhaustive old-owner termination and atomic reservation as
prerequisites for that manual work only. Connected read access can supply its
evidence. It produces no live claims or assertion of exclusive ownership.

Keep all executable admission/recovery commands, freeze configuration, claims,
receipts, historical branches and evidence. Ordinary new, scheduled, package and
parallel pickup stay disabled. Existing lock/claim refs still require separate
reconciliation; they cannot be ignored or removed through this exception.

## Alternatives

Reverting #235/#236 reinstates the deadlock. A new scheduler, lock service or
credential flow exceeds scope. Continuing exhaustive atomic recovery remains an
option when its prerequisites can be met. Pretending old workers stopped would
falsify evidence and is rejected.

## Consequences

Serial coordination is cooperative, not enforced fencing. Old sessions may resume
or write between checks; concurrent supervisors can conflict. Exact-head checks
and client-side leases detect some movement but do not eliminate this risk.
Accepting this risk is changed operating policy, not positive cessation evidence.
This route authorises neither all five existing PRs nor any feature edit in this
governance task. Each repair needs explicit selection; each merge/release needs
human approval. Prior dated handovers remain historical evidence.

## Security impact

No provider permissions, GitHub rulesets or production controls change. The
CS-111 archive denial remains binding. No alternative stopping action, denied
publication retry, secret extraction or new credential creation is authorised.
All quality, independent-review, hosted-validation and release gates remain.

## Cost impact

A$0 additional monthly and annual provider/dependency cost.

## Migration impact

Policy/docs only; no application/database migration, dependency or runtime change.
Existing atomic adoption remains separate and retains its original prerequisites.

## Product Principles supported

Protect trust through honest risk reporting and bounded delivery; reduce repeated
operator effort without claiming guarantees that the available platform cannot prove.

## Rollback or reconsideration trigger

Stop assigning manual repairs on unexpected writes, uncertain state or a changed
risk decision. Keep pickup disabled and preserve all refs/evidence. Returning to
unattended or parallel builds requires separate reviewed authority and safety work.
