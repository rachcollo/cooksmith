# ADR 021: Reviewed serial legacy build recovery

- **Status:** Proposed
- **Date:** 2026-11-17

## Context

ADR 020 admits only new Ready work. Retained branches conservatively occupy all
capacity, while existing repairs cannot reserve through that selector. The owner
approved one governance bootstrap, not fabricated claims or a general bypass.

## Decision

Freeze new admission. Permit one exact existing repair using a separately approved
external manifest, current-main baseline and canonical JSON digest. Require positive
termination evidence for all owners, an exact complete branch/PR inventory and
unchanged dependency/completeness gates. Reuse the atomic admission lock and ordinary
claims. Preserve an immutable manifest consumption receipt, without TTL or automatic
retirement. See the [runbook](../../operations/BUILD_ADMISSION.md).

## Alternatives

Deleting retained branches destroys useful work. Ignoring unknown branches hides
writers. A repository-committed inventory cannot include its own publishing branch's
final SHA without circularity. A new provider or automatic expiry weakens existing
ownership guarantees. None is required.

## Consequences

The operator must verify actual stop/join records and independent approval; scripts
validate their presence and exact inventory but cannot prove external worker liveness
or authenticate human approval. Any uncertain state requires reconciliation. All
branches remain witnesses, including historical and package branches. Another repair
needs new reviewed evidence after prior claim/owner reconciliation.

## Security impact

Existing secure-runtime credentials, tag protection and release gates remain. No
platform permission bypass, hosted configuration change or connector substitution.

## Cost impact

A$0 additional monthly and annual cost; no dependencies or providers added.

## Migration impact

No database/application changes. Keep scheduler off. Review and accept the mechanism
before preparing an executable adoption manifest. No live adoption occurs here.

## Product Principles supported

Protect household trust through dependable delivery and preserve real work while
reducing repeated operator effort caused by the admission deadlock.

## Rollback or reconsideration trigger

Keep admissions frozen on uncertainty. Preserve all lock, claim and consumption refs.
Return to ordinary/parallel admission only through separately reviewed safety work.
