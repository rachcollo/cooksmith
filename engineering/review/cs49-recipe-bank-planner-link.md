# Engineering Package — CS-49: Recipe-bank Planner Links

**Status:** In Review

**Branch:** `fix/meal-planner-recipe-selection`

**Base:** `main` at `ec3e0be8626fabc78686fd9d22ed028b450085f4`

**Jira:** CS-49

## Objective

Allow a household member to add a visible public or owned private recipe-bank item to the shared meal planner without weakening existing household recipe boundaries.

## Approved behaviour

- Preserve free-text and household-recipe planned meals.
- Store imported recipe references separately from household recipe references.
- Allow public imported recipes and private imports owned by the current user.
- Reject inaccessible private imported recipes and ambiguous dual links.
- Keep the planned title snapshot if a linked recipe later becomes unavailable.

## Acceptance criteria

- [x] The planner submits recipe-bank selections using the imported source.
- [x] Application regression coverage verifies the selected-recipe submission.
- [x] Database tests cover public, owned private, inaccessible private and dual-link cases.
- [x] No Edge Function or dependency change is introduced.
- [ ] Local PostgreSQL validation or the unchanged GitHub Actions database gate passes.
- [ ] Hosted behaviour is verified after the migration is released.

## Release impact

The additive migration must be deployed after merge through the protected Production database release workflow using the exact merged `main` SHA. No Edge Function release is required. Cost impact is A$0/month and A$0/year.

## Rollback

Use a forward fix if the shared migration has been released. The application remains compatible with existing free-text and household-recipe records.
