# Engineering Package — CS-95: Core screen and Home polish

## Metadata

- **Jira issue:** [CS-95](https://smillins.atlassian.net/browse/CS-95)
- **Epic:** Beta Launch (CS-8)
- **Status:** Implemented; review and hosted/manual acceptance pending
- **Branch:** `feat/cs-95-home-cross-app-polish`
- **Depends on:** Orchard route migrations and existing admin authorisation
- **Blocks:** CS-25

## Product Outcome

Make the everyday Cooksmith experience calm, readable and complete for beta onboarding.

## Scope and Decisions

- Replace Pantry suggestion copy `+ cart` with `Add to Shopping`.
- Increase and centre primary suggestion text without reducing 44px actions.
- Remove redundant Recipe Library/card/detail explanatory text and secondary metadata.
- Show an Admin menu item only when the established server-authoritative permission resolves true.
- Make Home a next-action view for new, partial and active households: plan, Get Ahead when available, shopping progress and concise empty-state guidance.
- Preserve Orchard tokens and existing product behaviour.

## Acceptance Criteria

- [x] Pantry suggestion tiles are readable at 320px and use clear action copy.
- [x] Recipe screens retain content needed to choose and cook while removing repetition.
- [x] Admin navigation and direct-route authorisation agree.
- [x] Home never shows a dead action and handles new, partial, active, loading and error states.
- [x] Core route regression, keyboard, reflow, text resize, focus and axe checks pass.
- [x] No household data is exposed through Home aggregation or stale route state.

## Technical Direction

Compose existing application queries rather than introducing a new dashboard backend. Keep permission evaluation in the current trusted admin contract. Avoid new dependencies, analytics or speculative personalisation.

## Verification

Component and Playwright scenarios for all Home states, admin/non-admin access, Pantry tiles and Recipe views at 320px and desktop. Run full quality and build checks.

## Release, Rollback and Cost

- **Expected migration:** None.
- **Expected Edge Function:** None.
- **Rollback:** Revert the application changes.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-95: Polish core screens and Home`


## Implementation and evidence

See [CS-95 handover](../../docs/engineering/handovers/cs95-core-screen-polish.md). Automated acceptance above is scoped to synthetic local integration/browser checks; hosted authenticated and physical-device acceptance remains pending. Home reads plan and Shopping in parallel, preserves user/household boundaries, and never generates a preparation plan. Get Ahead's link is an entry point, not a claim that enrichment is ready. Admin navigation and route guards use the same server permission contract; no source permissions change.

The branch starts from accepted main `fb8e3e2fd5afd452077696fcea4bfa28a27a7517`. PR195 is now accepted in this main baseline; its correction is not modified by this polish and its release/hosted acceptance remains separate. The combined candidate preserves PR190 favourites and PR189/191/192/193 features. CS-100 catalogue assessment does not authorise publication, public edits or paid enrichment. No migrations, Edge Functions, dependencies or recurring costs.

## Owner-requested Shopping follow-up

On 6 October the owner confirmed PR194/195 functionality, then requested smaller Shopping boxes, repair of post-edit visual displacement and removal of the shopper refresh burden. Shopping now uses a 20px mark inside a 44px target with explicit grid alignment; WebKit reproduces the old automatic-margin failure and passes with the correction. Repeated-edit/fresh-render checks preserve exact text and row controls. The shopper refresh button is removed. Existing Admin gains an explicitly clicked, bounded current-household repair with contract/count/no-op/error diagnostics and a fresh server-admin permission check. The underlying RPC keeps its existing active-household authorisation; no global admin access, new grant, recipe writes, automatic background work or production execution is added. Normal import/plan/recipe lifecycle reconciliation remains. The six Shopping browser tests also run in WebKit CI.
