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

- [ ] Active members see the same favourite state.
- [ ] Toggle feedback is immediate, idempotent and recoverable.
- [ ] Search and Favourites filtering work together on mobile and desktop.
- [ ] Deleted, unpublished or inaccessible recipes cannot remain actionable.
- [ ] Household switching clears stale state and forged identifiers fail.
- [ ] Auto planning preserves dietary, lock and variety rules.
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
