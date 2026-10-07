# ADR 017: Atomic shopping put-away with availability receipts

- **Status:** Proposed
- **Date:** 2026-10-06
- **Issue:** CS-98

## Context

The old put-away flow matched available Pantry records only, incremented quantities, remembered reviewed purchases in browser memory, then deleted Shopping separately. It could miss unavailable stock, repeat an applied purchase after refresh and partially clear provenance. MVP Pantry availability does not support a trustworthy stock-quantity ledger.

## Decision

Review completed, unapplied purchase contributions from the server. Group names using CS-79 canonical identity; let members exclude or correct each proposed Pantry name. Applying a selection marks matching Pantry records available, preserving their quantities, units, classifications and locations. New records have unknown quantity/unit and reuse current automatic classification. Exact Pantry names take priority; otherwise one canonical match is used, including unavailable records. Multiple canonical matches require an exact corrected name rather than an arbitrary selection.

Commit selected availability updates, per-source receipts and a batch result in one private transaction behind an authenticated security-invoker RPC. Receipt tables have active-member SELECT only. The private security-definer boundary is necessary to write protected receipts and Pantry atomically; it checks `auth.uid()`, current active membership, household-scoped source identities and reviewed snapshot tokens. It takes the existing household Shopping advisory lock and stable row locks, coordinating completion, overrides, recipe refresh and removal. It does not mutate any Shopping row, contribution, bought state, quantity or manual override.

A stable operation UUID and exact request return the stored result on network retry. Another operation for a receipted source cannot restore subsequently consumed stock. A failed batch rolls back everything; excluded groups are not receipted and remain eligible. A second member may report already-applied sources without applying them twice. Receipts retain historical Shopping, contribution and plan identifiers after source deletion. Pantry deletion clears the target reference but preserves the receipt.

Use one receipt per contribution UUID, or per manual row when no contributions exist. CS-101 equivalent source provenance in the same planned meal also suppresses replay if a refresh replaces the contribution representation. Orphan manual overrides cannot become new purchases. Corrections to an already-applied purchase do not reopen put-away; a new planned meal or genuinely new manual entry is a new purchase. This is deliberately availability-based, not quantity accounting.

CS-97 bought state is purchase-level and global. Put-away reviews bought items across all periods, stated in the dialog, so changing a projection does not invent another purchase or discard receipts. No CS-97 schema/code dependency is needed for the standalone implementation, but combined verification and release ordering are required.

Return `PT409` for a changed review, not deliberately raised SQLSTATE `40001`. The local PostgREST path hung/retried on the serialization signal; explicit HTTP conflict returns promptly and lets the UI recover.

## Alternatives

- Browser-only reviewed keys: lost on refresh and do not protect concurrent members.
- Separate Pantry updates and Shopping deletion: allows partial application and removes source provenance.
- Exact quantity increments: outside the MVP availability contract.
- Receipts only on purchase display rows: loses per-contribution provenance and cannot distinguish future planned purchases safely.

## Consequences

The review preserves bought history instead of clearing it. Users may remove Shopping items using the existing explicit action. Excluded items can be reviewed later. There is no put-away undo that could erase stock another household member has used; corrections use Pantry's existing availability controls. Reads are refreshed on interaction, not realtime. Receipts use existing database storage.

## Security impact

RLS and explicit SELECT-only grants protect receipts. Private privileged code has an empty search path and explicit execute grants; no caller identity is accepted. Foreign household/source identifiers, inactive membership and anonymous access are tested. Snapshot tokens detect changed review data and do not replace authorisation. Fixtures and API harnesses use synthetic local data only.

## Cost impact

No new provider, dependency or paid evaluation. Incremental recurring estimate A$0/month and A$0/year within existing database allocation.

## Migration impact

Additive `20261006015319_shopping_put_away.sql`; no data backfill or shared migration rewrite. Apply the protected database release before its client, preserving review queue migration order. Sources remain intact. Generated API types and the policy matrix are updated.

## Product Principles supported

Remove duplicate household entry, preserve trust through explicit review, and keep small-screen actions understandable.

## Rollback or reconsideration trigger

Hide the action, retain receipts and forward-fix. Do not restore the legacy quantity-increment/delete flow. Revisit only if a reliable stock ledger or an explicit repeat-purchase lifecycle is approved.
