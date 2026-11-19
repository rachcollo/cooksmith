# Engineering Package CS-116: Recognise the same ingredient across recipes, Shopping and Pantry

## Metadata

- **Jira issue:** `CS-116`
- **Jira link:** https://smillins.atlassian.net/browse/CS-116
- **Epic:** Shopping Lists (CS-6)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `feat/cs-116-ingredient-identity`
- **Depends on:** CS-79, CS-101
- **Blocks:** None
- **Package path:** `engineering/ready/cs116-ingredient-identity.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S5 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

The same ingredient merges into one shopping line, sits in the right aisle and is matched against the pantry, so the list is short and correct.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `canonicalIngredientName` singularises from a 16-word map (`src/domain/shopping/ingredientIdentity.ts:4-21`): "mushrooms" and "mushroom" produce different purchase keys. Reproduced.
- `categoriseIngredient` uses `includes` on keywords (`src/domain/shopping/planGeneration.ts:22-149`): chicken stock is Meat and seafood; eggplant and cream of tartar are Dairy and eggs; black beans are Produce. Reproduced.
- The pantry hint renders only for `state === 'match'` (`src/domain/shopping/pantryMatching.ts:20-43`, `src/routes/ShoppingPage.tsx:563`).
- `ingredientIdentityVersion` is 1 and is embedded in purchase keys.

## Scope

### Included

- Rule-based singularisation with an exceptions list.
- A synonym table for common Australian and imported-recipe terms.
- Phrase and whole-word categorisation with explicit precedence.
- A reviewed fixture of at least 150 ingredients.
- A pantry hint for related matches.
- A versioned identity bump with a safe refresh of existing lines.

### Explicitly Out of Scope

- Any model call in the shopping path.
- A user-editable ingredient catalogue.
- Unit conversion changes.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Regular plurals and common synonyms resolve to one purchase identity without a per-word list.
- [ ] The 150-item fixture is categorised correctly, including chicken stock, eggplant, cream of tartar and black beans.
- [ ] Category uses whole-word and phrase matching with explicit precedence.
- [ ] Related pantry matches show a check-pantry hint naming the pantry item.
- [ ] Existing shopping lines, contributions and receipts are not duplicated or orphaned by the identity change.
- [ ] No model call is added to the shopping path.

## Technical Direction

- Bump `ingredientIdentityVersion`; use the existing structure refresh path (`refreshStructure`) to migrate contributions.
- Keep packaged and prepared products distinct, as the current guard does.
- Keep pantry auto-combination off: hints only.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: fixture table, plural rules, precedence.
- Integration: two recipes with plural variants merge; pantry hint for related match.
- pgTAP if the refresh RPC changes.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None expected; confirm during build whether the server-side refresh RPC embeds identity.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Do not start until CS-79 and CS-101 are merged; this package assumes their identity and structure code as the baseline.
- Only the bounded existing #234 engineering repair may use the
  [supervised merged-baseline allowance](../../docs/operations/BUILD_ADMISSION.md#selected-234-repair-merged-baseline-versus-release-acceptance)
  after that proposal is accepted and merged. This does not complete either upstream
  story, alter dependency links, approve #228 adoption or grant release authority.
  CS-79 conversion product acceptance and CS-101 hosted Shopping/Get Ahead lifecycle
  acceptance remain required before the relevant production release; Jira Done follows
  actual final checks.

## Pull Request

Title: `CS-116: Recognise the same ingredient across recipes, Shopping and Pantry`
