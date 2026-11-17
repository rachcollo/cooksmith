# Engineering Package CS-110: Respect household allergies and dietary rules when planning the week

## Metadata

- **Jira issue:** `CS-110`
- **Jira link:** https://smillins.atlassian.net/browse/CS-110
- **Epic:** Meal Planning (CS-4)
- **Priority:** Highest
- **Status:** `Ready`
- **Branch:** `feat/cs-110-allergen-safe-week-planning`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs110-allergen-safe-week-planning.md`
- **Source:** Four-reviewer review, 17 November 2026, findings S1 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

A household that has told Cooksmith about allergies or dietary requirements can trust every dinner Cooksmith proposes. Generated and replacement dinners exclude unsuitable recipes, manual choices carry a clear warning, and the product copy promises only what is enforced.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Onboarding states "Allergies are treated as hard exclusions, not suggestions" (`src/routes/onboarding/OnboardingPage.tsx:341`).
- `proposeWeekMeals` and `randomReplacementRecipe` shuffle every non-archived recipe, including shared ones, and read no household preference (`src/domain/meal-plans/weekGeneration.ts:17-34, 61-67`).
- Household allergies and dietary requirements are stored per person and household (`src/domain/households/preferences.ts`) and are read only by onboarding and Settings.
- Recipe ingredients are available as structured rows (CS-101) for household and imported recipes.

## Scope

### Included

- A deterministic, versioned allergen and dietary matcher in `src/domain` over recipe ingredient names.
- Filtering in Plan my week, Replace my week, per-day replace in the proposal and planner Replace.
- A warning before saving a manually chosen recipe that conflicts.
- An explanation when the filter leaves days unfilled.
- Onboarding and Settings copy aligned to the enforced behaviour.

### Explicitly Out of Scope

- Time, budget and skill constraints (CS-40).
- Learning from household choices (CS-44).
- Any model call in the planning path.
- Per-person meal variants.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Plan my week, Replace my week, per-day replace and planner Replace never propose a recipe that matches a household allergy.
- [ ] Dietary requirements exclude recipes where ingredient data proves a conflict.
- [ ] Recipes that cannot be assessed are marked "not checked" and are never auto-proposed to a household with allergies.
- [ ] Search and manual selection allow any recipe but show a clear allergen warning before saving.
- [ ] When fewer suitable recipes exist than days, the proposal states why days are unfilled.
- [ ] Onboarding and Settings copy describes exactly what is enforced.
- [ ] Tests cover every listed allergen option, free-text allergies, shared recipes and the unassessable case.

## Technical Direction

- Keep the matcher pure and framework independent; pass household exclusions into `proposeWeekMeals` and `randomReplacementRecipe` rather than reading context inside them.
- Match on whole words and known derivatives (for example milk: butter, cream, cheese, yoghurt), not substrings.
- Treat a recipe with no structured ingredients as unassessable, not safe.
- Free-text allergies match by whole word against ingredient names.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Unit: matcher table per allergen, derivatives, false-positive guards (coconut milk, peanut butter, eggplant).
- Integration: generator, replace and planner flows with a household that has allergies.
- Playwright: warning on manual selection at mobile and desktop with axe.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** None expected.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Should recipe enrichment allergen data be used when present, in addition to the deterministic matcher? Recommended: yes, as a second signal that can only add exclusions.
- Is "not checked" acceptable wording for unassessable recipes?

## Pull Request

Title: `CS-110: Respect household allergies and dietary rules when planning the week`
