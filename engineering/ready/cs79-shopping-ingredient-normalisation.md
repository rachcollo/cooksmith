# Engineering Package — CS-79: Shopping ingredient normalisation

## Metadata

- **Jira issue:** [CS-79](https://smillins.atlassian.net/browse/CS-79)
- **Epic:** Shopping Lists (CS-6)
- **Status:** Ready
- **Branch:** `feat/cs-79-shopping-ingredient-normalisation`
- **Depends on:** CS-22
- **Blocks:** CS-98

## Product Outcome

Show one trustworthy shopping row for equivalent recipe ingredients without merging materially different products or inventing unsafe totals.

## Scope and Decisions

- Introduce a deterministic, versioned canonical ingredient identity.
- Normalise case, punctuation, common plurals and an approved Australian synonym dictionary.
- Sum only compatible units. Keep incompatible units separate and show their source quantities.
- Ignore preparation wording only when it does not alter the purchased product.
- Preserve fresh, powdered, dietary, package and other material distinctions.
- Preserve contribution provenance so meal-plan reconciliation remains exact.
- Do not silently merge manual items and do not require an AI provider.

## Acceptance Criteria

- [ ] Garlic powder variants consolidate, while fresh garlic remains separate.
- [ ] Compatible quantity/unit variants produce a correct total.
- [ ] Incompatible units remain clear and are never given a false combined value.
- [ ] Removing or editing one planned meal removes only its contribution.
- [ ] Completion state survives a semantically equivalent regeneration.
- [ ] The normaliser is framework-independent, deterministic and corpus tested.
- [ ] Household switching and RLS prevent cross-household reads and writes.
- [ ] Existing shopping and Pantry journeys remain usable.

## Technical Direction

Create a typed domain normaliser with explicit versioning and provenance-aware aggregation. Inspect the current generated-item identity before choosing whether persistence requires an additive migration. Record an ADR only if the canonical contract becomes durable across Shopping, Pantry and Recipes.

## Verification

- Unit corpus for spelling, plurals, synonyms, qualifiers and unit compatibility.
- Integration tests for plan add/edit/remove, completion preservation and idempotent regeneration.
- Database/RLS and generated-type checks if persistence changes.
- Playwright at 320px and desktop, plus keyboard and axe checks.
- Run `npm run preflight`, install, format, lint, typecheck, tests and build.

## Release, Rollback and Cost

- **Expected migration:** Possible additive identity/provenance migration, confirm during implementation.
- **Expected Edge Function:** None.
- **Rollback:** Revert application logic; forward-fix any released migration.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-79: Consolidate equivalent shopping ingredients`
