# Engineering Package — CS-95: Core screen and Home polish

## Metadata

- **Jira issue:** [CS-95](https://smillins.atlassian.net/browse/CS-95)
- **Epic:** Beta Launch (CS-8)
- **Status:** Ready
- **Branch:** `feat/cs-95-core-screen-polish`
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

- [ ] Pantry suggestion tiles are readable at 320px and use clear action copy.
- [ ] Recipe screens retain content needed to choose and cook while removing repetition.
- [ ] Admin navigation and direct-route authorisation agree.
- [ ] Home never shows a dead action and handles new, partial, active, loading and error states.
- [ ] Core route regression, keyboard, reflow, text resize, focus and axe checks pass.
- [ ] No household data is exposed through Home aggregation or stale route state.

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
