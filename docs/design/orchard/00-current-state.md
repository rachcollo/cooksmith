# Current implementation — verified state (read this first)

Facts confirmed by reading `main` on 2026-07-26. Everything in the handoff is reconciled
against this. Where the Orchard mock-ups show capability the app does not yet have, it is
labelled **[PRODUCT — FUTURE STORY]** and excluded from visual-migration acceptance.

**Baseline:** branch `main`, commit
`67a8f38c8185cd2995bea69963357f2499c53924`, read 2026-07-26. The `path:line`
numbers in *Source citations* describe that commit and **must be re-verified** if
implementation begins from a later baseline.

## Navigation (source: `src/app/navigation/navigationItems.ts`)
`navigationItems` (desktop rail, **7 destinations**), in order with Lucide icons:
Home (`House`, `/`), Pantry (`CookingPot`, `/pantry`), Recipes (`BookOpen`, `/recipes`),
Plan (`CalendarDays`, `/plan`), Shopping (`ShoppingBasket`, `/shopping`),
Get Ahead (`Sparkles`, `/get-ahead`), Settings (`Settings`, `/settings`).
`mobileNavigationItems = navigationItems.filter(label !== 'Settings')` → **6 mobile**
destinations (Settings is desktop-only, not a header link).

## Home (`src/routes/HomePage.tsx`)
Foundation screen: `PageHeader` + three `Card`s (Compass/ShieldCheck/Check) + an "About
this preview" `Dialog`. **No** tonight's-meal, swap/lock, weekly strip or running-low data.
→ Orchard Home composition is **[PRODUCT — FUTURE STORY]**. The migratable work today is
restyling the existing foundation screen.

## Recipes (`src/routes/RecipesPage.tsx`)
`filteredRecipes` = `recipes.filter(r => r.name.toLocaleLowerCase().includes(query))` —
**name search only**. Add/edit/delete recipe, quick-add to next empty plan date.
`src/domain/recipes/types.ts`: `category: string | null`, `tags: string[]`
(validation: category ≤80 chars nullable; tags ≤12, de-duped, lower-cased).
→ Filter chips and fixed Quick/Veggie/Pantry categories are **[PRODUCT — FUTURE STORY]**.
Tags are free strings, not an enum.

## Plan (`src/routes/PlanPage.tsx`, `src/domain/meal-plans/week.ts`)
`weekStart` state, `days = weekDays(weekStart)` (7), `weekEnd = addDays(weekStart, 6)`,
`previousWeek`/`nextWeek`/back-to-`thisWeek`. Dinner meals; add/edit/remove/replace via
`RecipeSearchField`; keyboard move (ArrowLeft/Right → `addDays(±1)`); weekly generation via
`meal-plans/WeekPlanGenerator.tsx` (`proposeWeekMeals`). → **Seven-day weekly planner**.
Fortnight / week-1+week-2 toggle / persistent locks are **[PRODUCT — FUTURE STORY]**.

## Shopping (`src/routes/ShoppingPage.tsx`, `src/domain/shopping/*`)
Items grouped by `ShoppingCategory` (auto `categoriseIngredient`), complete/uncomplete
toggle, pantry-aware reconciliation & put-away proposals. **No clipboard / "Copy for
Woolworths/Coles" export** anywhere in `src`. → retailer copy is **[PRODUCT — FUTURE
STORY]** (planned `engineering/planned/cs41-copy-retailer-ready-shopping-list.md`).

## Pantry (`src/routes/PantryPage.tsx`, `src/domain/pantry/*`)
Search + filter drawer (`ListFilter`) with location / availability / category selects;
grouped by `pantryCategoryLabels`; each item has a boolean `available`
(`AvailabilityFilter = all | available | unavailable`); add/edit staple with automatic
categorisation; pantry insights (`Sparkles`). → **Availability is a boolean**, not a
segmented stock level. Segmented stock bars and a "Confirm pantry check" action are
**[PRODUCT — FUTURE STORY]**.

## Get Ahead (`src/routes/GetAheadPage.tsx`, `src/domain/get-ahead/session.ts`)
Fully implemented. Uses the current week (`currentWeek`, `addDays(+6)`). Duration presets
(15/30/45/60/120 + custom 5–240), `createGetAheadSession`, task checklist with
complete/reopen/skip/defer, user overrides (include/exclude), progress summary
(`getAheadTotals`), end-early (`window.confirm`), localStorage persistence. **Task
consolidation ("covers X") is real** (`GetAheadConsolidation`, `consolidateTasks`). →
Reskin the existing UI; do not simplify the model.

## Tokens / styling
Canonical `--colour-*`. American `--color-*` drift: 20 refs across
`src/styles/components.css` and `src/styles/navigation.css` (some point at undefined
tokens). Fonts loaded via `src/main.tsx` → `./styles/global.css`; `.eyebrow` is currently
bold sans. No font packages installed yet.

## Shared components (unchanged API — restyle only unless noted)
`Button` (primary/secondary/quiet, busy, disabled), `IconButton`, `Panel`/`Card`,
`Badge` (neutral/positive/attention), `TextField`/`TextArea`/`SelectField`/`FormField`,
`Dialog`/`Sheet`/`ModalSurface`, `EmptyState`/`ErrorState`/`LoadingState`/`FeedbackState`,
`PageHeader`, layout primitives.

## Source citations

Line numbers as of the 2026-07-26 read of `main` (see Baseline) — re-verify before coding.

- **Navigation:** `src/app/navigation/navigationItems.ts:11–21` (7-item array; Get Ahead
  L17; `mobileNavigationItems` filters Settings L21).
- **Home is foundation:** `src/routes/HomePage.tsx` (PageHeader + three `Card`s + About
  `Dialog`; no meal/plan data).
- **Recipes name-only search:** `src/routes/RecipesPage.tsx:177–179` (filter),
  `:587–589` (search field), `:49` (`category` default `null`).
- **Recipe schema:** `src/domain/recipes/types.ts:38–39`
  (`category: string | null`, `tags: string[]`); `src/domain/recipes/validationSchemas.ts:97–101`.
- **Plan is 7-day weekly:** `src/routes/PlanPage.tsx:105` (`weekStart`), `:121`
  (`weekDays`), `:126` (`weekEnd = addDays(weekStart, 6)`), `:460`/`:476`
  (`previousWeek`/`nextWeek`), `:123` (dinner filter), `:416` (keyboard move);
  generation `src/routes/meal-plans/WeekPlanGenerator.tsx:104` (`proposeWeekMeals`).
- **Shopping has no retailer/clipboard export:** grouping + complete toggle
  `src/routes/ShoppingPage.tsx:119–124`; grep `clipboard|Woolworths|Coles|writeText`
  across `src/` = **0 matches**.
- **Pantry availability is boolean + filter drawer:** `src/routes/PantryPage.tsx:43`
  (`AvailabilityFilter`), `:60–63` (filter state), `:185–197` (`filteredItems`),
  `:478–483` (category filter); `src/domain/pantry/types.ts:53` (`pantryCategoryLabels`).
- **Get Ahead full model incl. consolidation:** `src/domain/get-ahead/session.ts:68`
  (`GetAheadConsolidation`), `:146` (`buildGetAheadTasks`), `:369` (`consolidateTasks`);
  `src/routes/GetAheadPage.tsx:193` (duration presets), `:225` (progress summary).
- **Token drift (American `--color-*`):** `src/styles/components.css:1964–2158`,
  `src/styles/navigation.css:223–263`.
