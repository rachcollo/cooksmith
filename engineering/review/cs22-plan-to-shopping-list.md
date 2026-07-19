# Engineering Package — CS-22: Add This Week's Meals to the Shopping List

**Status:** In Review

**Branch:** `claude/codebase-review-cto-report-57fj64` (built during the CTO review session; rename or re-point to `feat/cs-22-plan-to-shopping-list` before PR governance if required)

**Depends on:** CS-21 (Merged)

**Blocks:** None

## Objective

Deliver the first generated-list behaviour promised by the CS-21 foundation: one action on the Shopping page that gathers ingredients from this week's planned meals with linked recipes, previews them, and adds them to the household's current list. This is the thin slice needed for the friend test so households can plan a week and shop from it.

## Approved behaviour

- A secondary "Add this week's meals" action sits beside the shopping summary.
- The action reads this week's planned meals (Monday to Sunday of the current week) and the household recipe library, entirely with existing read paths.
- Ingredients come from structured `ingredientRows` when present, otherwise from the recipe's multiline ingredients text, one item per meaningful line.
- Duplicate ingredient names across meals merge case-insensitively; numeric quantities with matching units sum, otherwise quantity and unit are cleared rather than guessed.
- Ingredients whose normalised name already exists on the list are skipped and named in the preview.
- Each addition receives a deterministic grocery category from a keyword table (longest keyword wins); unknown items fall back to Other.
- A preview dialog lists exactly what will be added, notes skipped and unlinked meals, and requires explicit confirmation. Nothing is written before confirmation.
- Confirmed additions insert in one batch with `manual = false` so generated provenance is recorded. Everything remains editable, completable and removable exactly like manual items.
- Empty states are explained in plain language: no linked meals this week, or everything already listed.

## Data contract

- No migration. The CS-21 schema already provides the `manual` provenance flag, the household+normalised-name uniqueness constraint, the audit/position trigger and full RLS coverage for inserts by active household members.
- Multi-row inserts may share a `position` value because the audit trigger computes it against the statement snapshot; list ordering falls back to display name, which is the intended presentation. Revisit only if explicit ordering of generated items becomes a requirement.
- A batch that races another member's insert of the same name fails with a friendly refresh message; the preview recomputes on the next attempt.

## Evidence

- `tests/unit/shoppingPlanGeneration.test.ts`: merge, unit-conflict, skip-existing, free-text fallback, quantity parsing, name clamping and categoriser behaviour.
- `tests/integration/shopping.test.tsx`: full preview-and-confirm flow through the page, including the already-listed notice and repository call shape.
- Existing pgTAP suite `0013_shopping_list_foundation.test.sql` continues to cover the insert path and RLS; no new database surface was added.
- `npm run lint`, `npm run typecheck` and the full Vitest suite pass.

## Explicitly out of scope

- Unit conversion, pantry-aware subtraction and canonical ingredients (later milestones).
- Fortnight ranges and week selection; the current week is the only target.
- Retailer export formatting (CS-2x smart shopping scope).
- Any AI-derived proposal; this behaviour is deterministic by design.
