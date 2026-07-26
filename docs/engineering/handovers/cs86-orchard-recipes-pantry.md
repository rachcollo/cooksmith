# CS-86 Orchard Recipes and Pantry handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-86-orchard-recipes-pantry`
- **Target:** `main`
- **Baseline:** `697a2208b34b9ffdfcb04ec84098d43d35a5b52a`
- **Implementation commit:** `c84a8a83e609bccac710de76cc0dba44053a6749`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Move Recipes and Pantry into the Orchard Editorial system while preserving the existing
search, authoring, editing, quick-add, availability, filtering, categorisation and pantry
suggestion workflows. The migration makes long recipe and pantry names readable on narrow
screens and adds no new user steps or product behaviour.

## Changes made

- Added Orchard photo frames and striped placeholders to recipe cards and recipe detail.
- Rendered arbitrary recipe tags with the shared generic `Tag` component, without adding
  a taxonomy or tag filtering.
- Reworked recipe cards into readable responsive rows/cards with editorial headings,
  mono metadata, full wrapping and existing quick-add behaviour.
- Restyled pantry categories and items as Orchard list rows with full name wrapping.
- Kept pantry availability boolean and added visible Available / Out of stock badges
  alongside the existing accessible toggle.
- Moved the existing pantry suggestions action into one lilac feature panel without
  changing the generation or dialog workflow.
- Added route regression assertions for arbitrary tags, availability text and the pantry
  insight callout.

## Files affected

| File | Purpose |
| --- | --- |
| `src/routes/RecipesPage.tsx` | Photo frames, free-string tags and detail composition |
| `src/routes/PantryPage.tsx` | Boolean status badges and feature-panel suggestion entry |
| `src/styles/components.css` | Orchard route layout, typography and responsive rules |
| `tests/integration/recipes.test.tsx` | Arbitrary-tag regression evidence |
| `tests/integration/pantry.test.tsx` | Status text and insight-callout regression evidence |
| `engineering/review/cs86-orchard-recipes-pantry.md` | Package lifecycle evidence |

## Validation

| Command or check | Result | Notes |
| --- | --- | --- |
| `npm ci --cache .npm-cache` | Passed | Exact lockfile installed with a writable cache |
| `npm run format` / `npm run format:check` | Passed | Repository formatting clean |
| `npm run lint` | Passed | Zero warnings |
| `npm run typecheck` | Passed | Strict TypeScript build |
| `npm run test` | Passed | 50 files, 260 tests |
| `npm run build` | Passed | Production bundle built |
| `npm run docs:commands:check` | Passed | 144 documented files audited |
| `npm run engineering:check-secrets` | Passed | No forbidden files or high-confidence secrets |
| `npm run security:audit-production` | Passed | Reviewed browser-only React Router exception |
| `npm run preflight` | Unavailable | Supabase CLI unavailable in this managed runner |
| `npm run test:e2e` | Unavailable | Playwright Chromium executable is not installed |

The managed runner also reports its existing `http-proxy` npm warning. It is not produced
by repository configuration. The two unavailable runner checks remain required in CI or
hosted validation.

## Preview and manual verification

On the exact Vercel Preview:

1. At 320 px, 390 px, 768 px, 1024 px and 1280 px, open Recipes and Pantry and confirm
   there is no horizontal overflow or essential text truncation.
2. In Recipes, verify populated, empty and no-search-match states; open a recipe with a
   long name, image, no image and arbitrary tags.
3. Create, edit, archive, import and quick-add a recipe; confirm dialogs, focus return,
   busy feedback and entered data remain intact.
4. In Pantry, search and exercise location, availability and category filters, including
   filtered-empty and clear-filters recovery.
5. Add, edit and remove a pantry item; toggle Available / Out of stock and confirm both
   the text badge and accessible toggle name update.
6. Open Review suggestions from the lilac panel and exercise Add, Got it and Ignore.
7. Keyboard through both routes and dialogs; run axe and confirm no serious or critical
   findings.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Dependencies:** None added or changed.
- **Accessibility:** Existing names, roles, dialog behaviour and 44-pixel controls are
  preserved. Status is not colour-only, long content wraps and decorative recipe imagery
  is hidden from assistive technology. Hosted axe, keyboard and responsive verification
  remain pending.
- **Security and privacy:** No auth, permission, household, persistence, provider or
  logging code changed. Tests use synthetic data only.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation commit. No data, provider or configuration
  repair is required.

## Deferred work

Recipe taxonomy/filter chips, automatic tag colour semantics, segmented pantry stock and
pantry confirmation workflows remain outside CS-86. CS-89 must wait until the remaining
Orchard route migrations are accepted.
