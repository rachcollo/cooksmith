# ADR 025: One local CS-79 quantity correction under the pickup freeze

- **Status:** Proposed; inactive until independent review, human acceptance and merge
- **Date:** 2026-11-22

## Context

The owner approved the separate Shopping quantity correction, then explicitly
approved preparing this docs-only governance proposal despite the freeze. The
current supervised exception requires an already-open implementation PR; CS-79's
new correction cannot honestly satisfy it. The [authority record](../../engineering/handovers/cs79-quantity-preparation-policy.md)
separates preparation approval from activation, feature work and publication.

## Decision

Supplement ADR 022 with only the [single CS-79 local preparation route](../../operations/BUILD_ADMISSION.md#single-cs-79-quantity-correction-local-preparation).
After policy acceptance and merge, fresh supervisor selection may permit one local
branch from exact accepted main for the specified quantity correction. Retain
complete inventory, dependencies, exact heads, one worker, stop conditions,
independent review, all applicable checks and separate publication authority.
Ordinary/scheduled/parallel pickup remains frozen. No runtime command changes.

## Alternatives

- Reusing #228 or #234 would exceed their scope and dependency allowances.
- Creating an empty PR or claim to appear admitted would misrepresent authority.
- Removing the freeze generally would permit unrelated work and is rejected.
- Waiting for ordinary recovery remains possible; the owner chose a bounded proposal.

## Consequences

The accepted route can prepare a reviewable fix without enabling a scheduler.
Unknown old workers remain a residual concurrency risk; inventory and exact-head
leases do not establish exclusive ownership or termination. Local completion is
not product acceptance, published CI, merge or release readiness. The proposal
itself authorises no feature edits. Further corrections cannot reuse this allowance.

## Security impact

No provider permissions, secrets, RLS/ACL, claim refs, receipts, hosted state or
release protections change. Prior denied actions remain binding. Any schema need
or scope expansion stops for separate approval.

## Cost impact

A$0/month and A$0/year additional cost. No paid processing or infrastructure.

## Migration impact

Documentation only. The future correction has no schema/migration authority.
No guessed legacy restoration, data rewrite or receipt/source deletion.

## Product Principles supported

Preserve trustworthy shopping quantities and reduce user effort without implying
unsupported conversion precision or silently losing required amounts.

## Rollback or reconsideration trigger

Stop selecting this correction if its scope, ownership evidence, dependencies or
baseline cannot be established. Keep pickup disabled and preserve work/history.
Withdraw future selections rather than deleting refs or introducing expiry cleanup.
