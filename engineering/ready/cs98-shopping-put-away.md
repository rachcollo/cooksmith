# Engineering Package — CS-98: Shopping put-away

## Metadata

- **Jira issue:** [CS-98](https://smillins.atlassian.net/browse/CS-98)
- **Epic:** Shopping Lists (CS-6)
- **Status:** Implemented, manual validation pending
- **Branch:** `feat/cs-98-shopping-put-away`
- **Depends on:** CS-79 and current Pantry lifecycle
- **Blocks:** None

## Product Outcome

Turn a completed shop into reviewed Pantry updates without requiring duplicate entry.

## Scope and Decisions

- Offer Put shopping away only when completed, not-yet-applied items exist.
- Present a review with include/exclude and editable item name.
- MVP Pantry has availability rather than reliable quantities, so matching records become available and new records are created once. Do not pretend to maintain precise stock counts.
- Use CS-79 canonical identities and current Pantry location categorisation.
- Record an idempotent application receipt per shopping contribution.

## Acceptance Criteria

- [x] The prompt appears only for eligible completed purchases.
- [x] Equivalent purchases produce one proposed Pantry update.
- [x] User corrections and exclusions are honoured.
- [x] Retry/refresh cannot apply the same purchase twice.
- [x] Existing matches become available; new items are not duplicated.
- [x] Cancel makes no change and partial failure is accurately recoverable.
- [x] Household isolation, concurrency, 320px, keyboard and axe tests pass.

## Technical Direction

Use an atomic, server-authorised application boundary with per-contribution receipts. Never infer household access from client state. Keep the review data minimal and privacy-safe.

## Verification

Cover full, partial and repeated application, Pantry matches, out-of-stock restoration, exclusions, concurrent members and unrelated households. Run migration, pgTAP, RLS, generated-type and full application checks.

## Release, Rollback and Cost

- **Expected migration:** Yes, additive idempotency/application receipt storage.
- **Expected Edge Function:** None expected.
- **Rollback:** Hide the action; preserve receipts and forward-fix schema.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-98: Put completed shopping away`

## Implementation evidence

See [handover](../../docs/engineering/handovers/cs98-shopping-put-away.md) and [proposed ADR 017](../../docs/architecture/decisions/017-shopping-put-away-receipts.md). Checked acceptance criteria describe local evidence; hosted Preview, cross-browser/device and assistive-technology checks remain pending.

The branch starts at accepted main `b2fb576ebce250e325df297670d62df18c523339`, which includes CS-79 and CS-101. It is not stacked on unmerged drafts. CS-97/PR191 integration retains global purchase bought state and period projection. Keep migration/release order PR189 → PR190 → PR191 → PR192 → this draft; record and retest Shopping conflict resolutions before merging. No further MVP item starts until this review is accepted.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Retain both CS98 receipt authorisation and CS101 public-recipe locking documentation; public source permissions stay closed. Preserve PR196's smaller aligned Shopping marks, absent shopper refresh control, explicit Admin maintenance and HTTP/WebKit tests. No Home redesign. Exact-head integration checks are reported in PR193. Migration `20261006015319` predates released PR195: separately approved protected Production database release on approved main requires reviewed remote history/pending-set dry-run and `allow_out_of_order_migrations: true` (`--include-all`). No Edge release or production actions performed.

## Integration after owner merges PR189 and PR190

Integrated main `c4f64ed2f5cbe17a2d2a005305e8cf633d82399d` without content conflicts. Retain both accepted favourites and put-away table/type contracts plus PR189 input anchoring, PR196 polish, public-recipe locks and HTTP/WebKit checks. Exact-head validation is recorded in PR193. No new migration, Edge Function or production action is introduced by this integration.

## Integration after PR191

Integrated accepted main `3f6ecebf8dd922be990cd6f022218ea7adde0e4b`. Combine Shopping-period and put-away repository contracts/methods, retaining period-aware listing and global idempotent put-away review. Both page controls remain; accepted mark alignment, absent shopper refresh, security and HTTP/WebKit checks are preserved. Exact-head tests are recorded in PR193. PR191 database release was waiting at read-only inspection; no approval/deploy performed. Existing put-away migration release requirements remain; no new migration or Edge change.

## Integration after PR192

Integrated accepted freezer main `19bb8c573c5f7dc75c595285a967fcd876d8974f`. Resolve ADR index conflicts by retaining both freezer reservation and put-away receipt entries. Preserve generated types, table contracts and all accepted features. Exact-head CI is recorded in PR193. No new migration, Edge Function, Home redesign or production action. The new CS97 default/dropdown work stays on a separate branch.
