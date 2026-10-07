# ADR 018: Measured stock and meal completion

- **Status:** Proposed
- **Date:** 2026-10-07
- **Issue:** CS-102

## Context
Shopping retains recipe demand and purchase history; Pantry stores nullable measured balances and availability; freezer stock already has reservations. A served meal must cease generating demand at the same instant its stock is consumed. Retrying or undoing after later household changes must not lose or duplicate food. Most households will not log every snack or stock adjustment.

## Decision
Keep mutable Pantry/freezer balances authoritative. Add narrow immutable operation receipts for deliberate completion and reversal; this is not event sourcing for all CRUD. A completion generation plus expected plan/stock snapshots protects stale requests. Retry identity includes the complete request, and Undo uses recorded effects against freshly reviewed balances, never current recipe quantities or a stale whole-row restore.

Project remaining Shopping demand from retained source contributions, allocate known compatible stock once before period selection, and preserve manual intent and purchased history. Buying and put-away must retain actual confirmed amounts so pending purchases and received stock do not count twice. Pending purchases retain per-measure consumption and a revision. Put-away transfers only the remainder. Undo resolves the recorded effect to its current holder, including Pantry after transfer, and aggregates effects returning to the same Pantry item. A stable invoker snapshot supplies the Shopping projection.

Use exact supported quantities only. A measured receipt against an unknown balance creates a known lower bound with `quantity_untracked=true`; zero lower bound still means stock may exist. Unsupported units remain checks. Explicit current-count correction can clear uncertainty. Low-input UI recognition, sensible defaults and one batch confirmation are acceptance requirements. Do not ask every row to restate known information. Manual adjustments remain optional because everyday usage, waste and substitutions are not fully observed.

## Alternatives
Client read/decrement or deleting Shopping contributions on completion loses atomicity/history. Recomputing Undo from current recipes can change the wrong amounts. Automatically assigning zero to an unknown stock balance fabricates precision. A mandatory household stocktake defeats the product promise.

## Consequences
The cross-domain transaction needs SQL/RLS, real HTTP concurrency and full browser journey tests. Source edits after completion require Undo; moving the occurrence does not consume again. Historical consumed freezer reservations must synchronise without a second decrement. New legacy consume/undo operations are rejected with a refresh instruction; exact historical retries remain valid. Existing consumed freezer reservations are marked completed without another stock deduction.

## Security impact
New receipts expose active-member SELECT only. Private privileged commands derive auth.uid, validate household identifiers and snapshots, use empty search paths and explicit grants. Direct writes cannot forge completion independently of stock. Public recipe records remain immutable.

## Cost impact
No dependency or provider added. A$0/month and A$0/year incremental recurring cost within existing infrastructure.

## Migration impact
Additive migration, locally reset and generated types verified. No production backfill or migration is authorised by this ADR. Owner's maintenance, merge, protected exact-SHA database release, optional Edge release, reopen sequence remains applicable. Immutable released migrations require forward fixes.

## Product Principles supported
Save time, reduce mental load, waste and grocery spend; one tap over five; safe defaults; calm progressive disclosure. Happy-path input/action counts are tested alongside technical integrity.

## Rollback or reconsideration trigger
Do not roll back to a client or RPC that can independently consume freezer stock or reintroduce completed meal demand. Preserve balances and receipts; disable affected actions and forward-fix if stock/demand invariants fail. Reconsider model expansion only for demonstrated household needs.
