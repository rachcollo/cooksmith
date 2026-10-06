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
