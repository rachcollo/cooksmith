# Engineering Package — CS-98: Shopping put-away

## Metadata

- **Jira issue:** [CS-98](https://smillins.atlassian.net/browse/CS-98)
- **Epic:** Shopping Lists (CS-6)
- **Status:** Ready
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

- [ ] The prompt appears only for eligible completed purchases.
- [ ] Equivalent purchases produce one proposed Pantry update.
- [ ] User corrections and exclusions are honoured.
- [ ] Retry/refresh cannot apply the same purchase twice.
- [ ] Existing matches become available; new items are not duplicated.
- [ ] Cancel makes no change and partial failure is accurately recoverable.
- [ ] Household isolation, concurrency, 320px, keyboard and axe tests pass.

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
