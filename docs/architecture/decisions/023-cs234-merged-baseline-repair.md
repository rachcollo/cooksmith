# ADR 023: Merged prerequisites for the bounded #234 repair

- **Status:** Proposed; operative only after independent review, human acceptance and merge
- **Date:** 2026-11-19

## Context

CS-116's accepted package requires merged CS-79/CS-101 code. Their implementation
PRs are merged and are ancestors of verified main, while both Jira stories remain
In Review for acceptance. The supervised dependency gate therefore prevents even
repairing #234's existing database expansion. The owner explicitly authorised a
one-off governance proposal despite the freeze, separating this engineering work
from final acceptance. See the [evidence handover](../../engineering/handovers/cs234-repair-prerequisites.md).

## Decision

Supplement [ADR 022](022-supervised-existing-pr-repair.md) only for existing #234:
replace the upstream Done-status prerequisite for CS-79/CS-101 with verified merged
and compatible technical baselines for its bounded lock-order/validation repair.
The [operative runbook](../../operations/BUILD_ADMISSION.md#selected-234-repair-merged-baseline-versus-release-acceptance)
defines the exact scope, checks and remaining release gates. No other dependency,
ordinary admission or new-story rule changes. This proposal authorises no feature
repair before its acceptance/merge and fresh supervisor selection.

## Alternatives

- Marking upstream stories Done or deleting links would falsify outstanding acceptance.
- Waiving dependencies generally would permit unrelated unsafe work and is rejected.
- Waiting for all hosted/product acceptance before preparing this repair retains the
  deadlock; the owner selected a bounded engineering/release distinction instead.

## Consequences

#234 can be repaired serially once this policy is operative and its other gates pass.
CS-79 conversion product acceptance and CS-101 hosted Shopping/Get Ahead lifecycle
acceptance remain explicit gates before relevant production release. Jira remains
In Review until actual final checks. No deadline or full MVP readiness is implied.

## Security impact

No permissions, credentials, RLS/ACLs, claims or release protections change. Old-worker
risk remains accepted, not resolved. Existing denial boundaries remain binding.

## Cost impact

A$0/month and A$0/year additional cost. No provider or paid backfill activity.

## Migration impact

Documentation only. No schema, application, generated type or runtime script changes.
Future #234 repair must establish migration provenance and preserve released migrations.

## Product Principles supported

Protect household trust through honest acceptance and compatibility evidence; reduce
operator work by allowing a bounded repair without misrepresenting release readiness.

## Rollback or reconsideration trigger

Stop selecting this repair if baseline, scope or release evidence becomes uncertain.
Keep ordinary pickup frozen; preserve all work and receipts. No automatic expiry or
extension to another story is introduced.
