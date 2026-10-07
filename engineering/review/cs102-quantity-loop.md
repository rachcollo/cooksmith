# Engineering Package: CS-102 quantity-aware household loop

## Metadata

- **Jira issue:** CS-102
- **Status:** In Review
- **Branch:** feat/cs-102-quantity-loop
- **Epic:** Pantry (CS-3)
- **Baseline:** main `3e3c53b496912d27b746098b5600db60aad701a4`
- **Depends on:** accepted CS-22, CS-79, CS-98, CS-99 implementation
- **Package path:** engineering/review/cs102-quantity-loop.md

## Product Outcome

Use food already owned, buy only the shortfall and keep stock accurate when a meal is served. Owner explicitly approved the complete quantity loop and compact Plan tick/secondary menu on 7 October 2026. Preserve historical Done stories; CS-102 owns the remaining behaviour. No new dependency or provider. A$0/month and A$0/year.

## Baseline and Scope

CS-98 PR193 is now merged and supplies atomic availability-only put-away receipts. CS-99 PR198 supplies freezer reservations and compact Pantry controls. CS-97 PR197 remains open and is not a prerequisite; preserve its future period-default integration. Existing recipe structure and Shopping contributions remain immutable source demand. Historical put-away receipts have no measured amount and must not be re-applied or assigned invented quantities.

Included: exact quantity allocation, measured put-away, revisioned meal completion/Undo, compact Plan actions and complete regression evidence. Excluded: Home polish, inferred densities/pack sizes/serving scaling, predictive stock, AI matching, recipe mutation, production operations and paid evaluation.

## Acceptance Criteria

- [ ] Allocate each known Pantry balance once in deterministic meal date/type/id order before period projection; 600g + 400g demand less 500g stock produces 500g shortfall.
- [ ] Keep manual entries, deliberate overrides and purchase history. Bought but not put-away counts once; put-away transfers coverage to Pantry without counting both.
- [ ] Review actual bought quantities and apply each purchase once atomically. Unknown existing balances retain uncertainty: a confirmed measured receipt establishes a labelled lower bound; it never fabricates the previous total. Optional current-count correction can restore an exact total.
- [ ] Done removes outstanding source demand and records reviewed stock deductions or freezer consumption in one transaction. Manual/leftover completion has no inferred ingredient effect.
- [ ] Undo uses immutable effect receipts, expected completion revision and fresh reviewed stock versions. Later changes are shown for review; never restore a stale whole row or recompute recipe quantities.
- [ ] Exact g/kg, ml/l and explicit count conversions only. Unknown, ambiguous and unsupported quantities stay checks, with correction/skip available.
- [ ] Moves do not consume again; completed source changes require Undo. Deletion retains audit history without restoring eaten food. Legacy consumed freezer reservations stay consumed.
- [ ] One Plan tick and secondary menu retain readable mobile titles, 44px targets, keyboard focus, drag alternative, 320px/200% reflow and reachable last day.
- [ ] SQL/RLS and HTTP prove atomicity, retry, concurrency, stale operations, isolation and immutable public recipes; browser journeys prove cross-page results.

## Invariants and Dataflow

Recipe snapshots -> retained meal contributions -> active demand -> single allocation against known Pantry plus unput-away bought coverage -> period projection. Shopping demand is not rewritten by stock changes. Completion state filters demand while the same transaction updates stock. Overrides remain explicit user intent and are not silently netted.

Ledger operations are household-scoped and caller-derived. An operation UUID plus immutable request identifies retries. Completion generation rejects stale Done/Undo cycles. Stock effects store actual signed amount, unit and item identity, not only proposed recipe totals. Undo adds the inverse delta to the reviewed current balance; identity/unit changes or deleted stock require correction rather than replacement. Unknown stock never becomes zero implicitly. Concurrent manual stock updates and review application use row locks plus expected versions.

Lock order must match existing freezer then shopping commands, then plan and Pantry rows in stable id order. Direct writes cannot bypass completion and receipt invariants. Receipts remain SELECT-only under active-household RLS; narrow private security-definer commands provide atomic writes, fixed empty search paths and explicit grants.

## UI and Error States

Show quantities to check in review, preserve source text and explain skipped effects. Done records known usage immediately and reports unknown ingredients without mandatory confirmation. Undo asks for confirmation only when the recorded stock has changed or moved since completion. Freeze submitted inputs during ambiguous network retry; reuse the operation id. Distinguish committed operation/failed refresh from rejected operation. Cancel mutates nothing. Household change/unmount discards late reads. Accessible labelled fields, focus restoration and secondary menu expose all actions without title compression.

## Validation Plan

Domain: metric/count conversion, ambiguity, unknowns, once-only allocation, periods, manual/override/bought handling. SQL/RLS: owner/member success; unrelated/inactive/anon/forged-id denial; retries, same id/different payload rejection, stale revisions, failed multi-line rollback, manual edits, concurrency, freezer parity and retained history. HTTP uses synthetic local PostgREST. Browser: buy -> put away -> Done -> Undo, manual/freezer/leftovers, mobile Chromium/WebKit, zoom, keyboard and axe. Run all repository static/database/type-generation gates and exact-head CI. Hosted and physical-device checks remain separately recorded; public smoke is insufficient.

## Release and Recovery

Migrations: additive ledger/completion/RPC changes required. Edge Functions: none planned. No production access authorised. Owner-controlled maintenance -> merge -> protected Production database release at exact approved main SHA (history/pending-set verification and dry-run) -> Edge if required -> reopen. Do not add a separate zero-downtime or staging prerequisite. Released migrations immutable; forward fixes only. Reverting UI must not erase ledger or re-enable a route that can double-consume. Review rollback compatibility against old freezer/put-away commands.

## Delivery Gates

Package precedes code. Local npm ci, preflight, format, lint, types, tests, build, docs/config/secrets/audit, SQL reset/lint/RLS/types, HTTP and Playwright before draft PR. Verify remote head, CI and changed files. Jira In Review after draft publication, never Done from a shallow smoke. No merge or deployment authority.

## Owner UX clarification and audit

Put-away must recognise and prefill known products, existing Pantry matches, amounts, units and locations. One batch confirmation; optional Change reveals editing, and only genuine uncertainty asks a question. Use the shared ingredient-structure projection on old Shopping rows as well as new imports, preserving raw text/provenance. No repeated raw recipe labels or per-row mandatory forms. User-journey acceptance, not just safety-test counts, decides readiness. Full scoped audit recorded in `docs/engineering/reports/cs102-guidance-audit.md`.

### Low-input upkeep acceptance (owner reinforcement)

- Ordinary known purchases: zero required text entries, automatically recognised identity/destination/amount/unit/location, one batch confirmation after opening.
- Known fresh or freezer dinner: one Done action, one Undo action when the recorded stock is unchanged. Only genuine conflicts require extra review.
- Unknown amounts do not block availability upkeep or require every ingredient to be measured. Show honest unmeasured stock; do not claim every snack, substitution or discarded item was captured.
- Reuse optional Pantry quick adjustments for real-world drift, without mandatory logging or a full stock audit.
- Report happy-path action counts and exception counts for a published synthetic fixture corpus; these are fixture coverage, not an invented real-user exception rate.
