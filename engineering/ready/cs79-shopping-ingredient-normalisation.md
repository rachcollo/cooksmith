# Engineering Package — CS-79: Shopping ingredient normalisation

## Metadata

- **Jira issue:** [CS-79](https://smillins.atlassian.net/browse/CS-79)
- **Epic:** Shopping Lists (CS-6)
- **Status:** Implementation review (draft PR; no release)
- **Branch:** `fix/cs-79-shopping-purchase-totals`
- **Depends on:** CS-22
- **Blocks:** CS-98

## Product Outcome

Show one trustworthy shopping row for equivalent recipe ingredients without merging materially different products or inventing unsafe totals.

## Scope and Decisions

- Introduce a deterministic, versioned canonical ingredient identity.
- Normalise case, punctuation, common plurals and an approved Australian synonym dictionary.
- Show one purchase row per product. Sum compatible units and sourced ingredient/form equivalents; show unsupported components concisely in that row. Keep original source quantities internally without a recipe dropdown.
- Ignore preparation wording only when it does not alter the purchased product.
- Preserve fresh, powdered, dietary, package and other material distinctions.
- Preserve contribution provenance so meal-plan reconciliation remains exact.
- Preserve manual records and require explicit opt-in before their amounts join a planned purchase; retain household adjustments and do not require an AI provider.
- Share purchasing identity with Pantry add/edit and shopping-to-Pantry matching. Existing aliases require user review; do not silently combine their quantities or delete records.
- Preserve original recipe preparation names and Get Ahead task semantics.

## Acceptance Criteria

- [x] Garlic powder variants consolidate, while fresh garlic remains separate.
- [x] 1 diced onion + 2 sliced onions + 1 chopped onion becomes 4 onions.
- [x] Pantry add/edit rejects new equivalent products; existing duplicates have a review route.
- [x] Material forms, varieties and original preparation remain separate.
- [x] Compatible quantity/unit variants produce a correct total.
- [x] Incompatible units remain clear and are never given a false combined value.
- [x] Removing or editing one planned meal removes only its contribution.
- [x] Completion state survives a semantically equivalent regeneration.
- [x] The normaliser is framework-independent, deterministic and corpus tested.
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

- **Expected migrations:** `20261004115348_shopping_purchase_groups.sql` and `20261004205943_recipe_purchase_measures.sql`. Both must precede the new app. The earlier `20261004104415` migration is already released and unchanged. See ADR 014 and handover.
- **Expected Edge Function:** None.
- **Rollback:** Revert application logic; forward-fix any released migration.
- **Recurring cost:** A$0/month and A$0/year.

## Pull Request

Title: `CS-79: Consolidate equivalent shopping ingredients`

## Implementation evidence

See [handover](../../docs/engineering/handovers/cs79-shopping-ingredient-normalisation.md) and [proposed ADR 014](../../docs/architecture/decisions/014-purchasing-ingredient-identity.md). Local database tests cover RLS and upgrade behaviour; hosted authenticated household switching remains a release check. CS-98 still owns unavailable-item restoration and durable put-away idempotency.

## Live-review follow-up

The owner requested one clean purchase total, no recipe-amount dropdown and support for old saved data and plan edits. Follow-up migration: `20261004115348_shopping_purchase_groups.sql` (the earlier migration is already released and immutable). Acceptance includes legacy text/fraction parsing, usage notes, tsp/mL aggregation, conservative material forms, atomic grouped completion/edit/removal and preserving explicit household overrides. Tablespoons/cups stay explicit until recipe measure conventions are known; no density guesses.

See [follow-up handover](../../docs/engineering/handovers/cs79-shopping-purchase-totals.md) for exact local, API, browser and upgrade evidence. Hosted authenticated testing requires a designated disposable account/household; public smoke checks are not functional proof.

## Pre-MVP measurement scope — 2026-10-04 voice clarification

The owner explicitly requested broader conversion before MVP. This extends the same draft PR; it does not authorise merge, deployment, production mutation or paid evaluations. Jira CS-79 was read back after its separate update.

- Persist explicit recipe measuring conventions, with exact sizes shown in the editor. Only verified publisher rules may supply an automatic convention; country suffix, household locale and AI confidence cannot.
- Aggregate g/kg and mL/L and verified tsp/tbsp/cup amounts. Current profiles: AU 5/20/250 mL, metric 5/15/250 mL, explicitly rounded US cooking 5/15/240 mL. These are specified cooking profiles, not a promise to recognise every regional/historical cup.
- Use a small immutable, sourced ingredient/form catalogue for cross-dimension shopping estimates. Initial coverage: plain flour, self-raising flour, ordinary butter (salted/unsalted kept separate), caster sugar, white sugar and olive oils (grades kept separate). No density for unspecified flour, brown sugar packing, salt flakes/fine/coarse salt, sprays, infused oils or fresh/dried alternatives.
- Show approximate results as `about`; round the final estimate up to a whole g/mL at 10 or more, otherwise one decimal. Exact compatible amounts retain two-decimal display. Do not round intermediate recipe fractions before aggregation. Keep original quantities/conventions and conversion IDs internally.
- Preserve manual opt-in: a manual record joins a planned purchase only after the shopper chooses “Include in this product’s planned total” in its editor. Earlier protected planned overrides retain their grouping. No Pantry records are combined.
- Repeat totals for every planned occurrence, refresh ingredient/convention edits, preserve explicit overrides and reject cross-household changes. The current planner has no serving multiplier; recipe servings are descriptive and must not be claimed to scale ingredient amounts.
- Product review must accept the catalogue, source interpretation, rounding, manual opt-in and unsupported fallback before MVP. In particular, generic sea salt flakes are still unsupported for mass/volume conversion. This is a review gap, not completed coverage.

Additional migration: `20261004205943_recipe_purchase_measures.sql`. No released migration is changed. See the current handover and ADR 014 for sources, boundaries and evidence.
