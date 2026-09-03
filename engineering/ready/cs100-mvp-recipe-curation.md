# Engineering Package — CS-100: MVP shared recipe curation

## Metadata

- **Jira issue:** [CS-100](https://smillins.atlassian.net/browse/CS-100)
- **Epic:** Administration & Public Content (CS-33)
- **Status:** Ready
- **Branch:** `feat/cs-100-mvp-recipe-curation`
- **Depends on:** Existing shared recipe import/admin flow and CS-93
- **Blocks:** CS-25

## Product Outcome

Give new beta households a useful, trustworthy starter catalogue while removing obvious duplicates and low-quality recipe records.

## Scope and Decisions

- Define and product-owner approve a balanced beta catalogue before publication.
- Use the existing attributed public recipe workflow, with source URL and creator attribution.
- Review title, ingredients, instructions, servings, image rights/availability, duplicate identity and publication state.
- Correct or unpublish weak existing records through supported admin paths.
- Queue Recipe Intelligence only through its approved idempotent pipeline.
- This package does not authorise scraping or copying protected source content.

## Acceptance Criteria

- [ ] The approved catalogue covers practical family meals and agreed dietary variety.
- [ ] Every public recipe has valid provenance and reviewable content.
- [ ] Exact and near duplicates are resolved without silent overwrite.
- [ ] Failed imports can retry without duplicating successful records.
- [ ] Household recipes and ownership data remain isolated.
- [ ] Enrichment reaches a terminal Ready or explainable failure state.
- [ ] A synthetic new household can browse, plan and shop from the starter set.

## Technical Direction

Prefer content/configuration work through existing admin boundaries. If the current workflow cannot safely support the catalogue, stop and return that gap to CS-43 rather than introducing an ad hoc seed or privileged client path.

## Verification

Validate import/retry/deduplication, publication visibility, attribution, enrichment and the new-household Recipes to Plan to Shopping journey. Record the approved catalogue and source evidence without committing copyrighted bulk content.

## Release, Rollback and Cost

- **Expected migration:** None expected.
- **Expected Edge Function:** No code change expected; existing enrichment may be invoked after publication.
- **Rollback:** Unpublish affected records through supported administration.
- **Recurring cost:** Existing Recipe Intelligence usage only; estimate and approve batch cost before running it.

## Pull Request

Title: `CS-100: Curate the MVP shared recipe collection`
