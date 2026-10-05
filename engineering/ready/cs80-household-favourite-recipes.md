# Engineering Package — CS-80: Household favourite recipes

## Metadata

- **Jira issue:** [CS-80](https://smillins.atlassian.net/browse/CS-80)
- **Epic:** Recipe Library (CS-5)
- **Status:** Ready
- **Branch:** `feat/cs-80-household-favourite-recipes`
- **Depends on:** Current Recipe Library and household membership
- **Blocks:** CS-78

## Product Outcome

Let a household keep a shared, quickly accessible list of recipes it knows and enjoys.

## Scope and Decisions

- Add a household-scoped favourite relation for both household and available shared recipes.
- Add accessible favourite/unfavourite controls to recipe cards and details.
- Add a Favourites filter that composes with search.
- Automatic planning may use favourites as one bounded preference signal, never as a guarantee or exclusive pool.
- No personal favourites, ratings, folders or learned ranking in MVP.

## Acceptance Criteria

- [x] Active members see the same favourite state.
- [x] Toggle feedback is immediate, idempotent and recoverable.
- [x] Search and Favourites filtering work together on mobile and desktop.
- [x] Deleted, unpublished or inaccessible recipes cannot remain actionable.
- [x] Household switching clears stale state and forged identifiers fail.
- [x] Auto planning preserves dietary, lock and variety rules.
- [ ] Keyboard, screen-reader, concurrency and RLS tests pass.

## Technical Direction

Use a polymorphic recipe-source discriminator consistent with Recipe Intelligence. Enforce household membership and recipe visibility server-side. Prefer a unique household/source/recipe constraint and an idempotent mutation.

## Verification

Cover both recipe sources, concurrent toggles, household isolation, unpublished recipes, plan generation, 320px layout, keyboard and axe. Run the full repository quality suite and database checks when the migration is introduced.

## Release, Rollback and Cost

- **Expected migration:** Yes, additive household favourites table and policies.
- **Expected Edge Function:** None expected.
- **Rollback:** Hide the UI and forward-fix the additive schema if released.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-80: Save household favourite recipes`

## Implementation evidence

See [CS-80 handover](../../docs/engineering/handovers/cs80-household-favourite-recipes.md). Automated keyboard, semantic accessibility, concurrency and RLS coverage is provided; physical screen-reader and hosted member checks remain unverified. Automatic planning keeps its existing ranking; the optional bounded favourite preference is not introduced.
