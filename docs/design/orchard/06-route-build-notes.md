# Route-by-route build notes — Orchard Editorial

## How to read this file

Each route lists: the **reference** (which `.dc.html` screen + exact PNG file), target
**viewport(s)**, the **states** to style, the **responsive** transform, and a strict
**change kind**. All facts about *current* behaviour are verified in
`00-current-state.md` — read it first. Copy in references is **representative**, not final.

**Authority order when references disagree:** ① these written rules → ② the `.dc.html`
reference → ③ the PNG. See `README.md`.

### Change-kind legend
- **[MARKUP]** layout/DOM change in a route file
- **[SHARED]** change to a shared component
- **[CSS]** purely visual CSS, no DOM change
- **[PRODUCT — FUTURE STORY]** new capability the app does **not** have today. **Out of
  scope for this visual migration** and excluded from its acceptance criteria. Do **not**
  tell Codex to "preserve" it, and do not build it here — it needs its own approved story.

### Global preservation contract (all routes)
This is a **visual reskin of what exists today**. Preserve current workflows, routing,
data loading, permissions, validation, accessible names/roles, keyboard interaction and
all `data-testid` / automation identifiers. A `[PRODUCT — FUTURE STORY]` item is neither
preserved nor built — it is deferred.

> Core route files are already implemented (`PantryPage` 29.5KB, `PlanPage` 26KB,
> `RecipesPage` 30KB, `ShoppingPage` 31.8KB, `GetAheadPage` 12.6KB). Read each fully
> before editing; intended work is mostly `[CSS]` + swapping ad-hoc styles to shared
> component variants.

---

## HomePage.tsx — `/`
- **Reference:** mobile `mobile-02-home.png`; desktop `desktop-01-home.png`
  (from the migration-safe `.dc.html` sheets). These depict the current foundation
  screen in the Orchard visual language.
- **Current state:** foundation screen — `PageHeader` + three feature `Card`s + an
  "About this preview" `Dialog`. No tonight's-meal, weekly strip, swap/lock or
  running-low data.
- **Migratable now [CSS]:** restyle the existing foundation screen into Orchard — mono
  eyebrow, Cormorant `h1`, cream cards, forest/`accent` buttons, restyled `Dialog`.
- **[PRODUCT — FUTURE STORY]:** the tonight's-dinner hero, this-week strip, pantry
  running-low strip and swap/lock actions shown in the reference. Build under a future
  Home story using the Orchard system; **excluded** from migration acceptance.
- **Responsive:** current screen already responsive; preserve its behaviour while
  applying the migration-safe mobile and desktop compositions.

## RecipesPage.tsx — `/recipes`
- **Reference:** mobile `mobile-05-recipes.png`, `mobile-06-recipe.png`; desktop
  `desktop-03-recipes.png`.
- **Current state:** **name search only** (`filteredRecipes`); recipe cards; add/edit/
  delete; quick-add to next empty plan date. `category: string | null`, `tags: string[]`.
- **Migratable now:** card grid → `Card` + Orchard type/spacing **[CSS]**; recipe photos
  use the **photo-frame** pattern with **striped placeholder** (no real images yet)
  **[CSS]**; free-string tags render via generic **`Tag` [SHARED/new]**; search field
  restyle **[CSS]**; single-recipe hero = **organic-blob photo-frame on lime** (chosen
  option A) **[CSS]**; ingredient pantry-owned vs shop markers as text/`Badge` **[CSS]**.
- **[PRODUCT — FUTURE STORY]:** filter chips, fixed Quick/Veggie/Pantry categories,
  colour-per-category. Do not add filtering UI.
- **States:** populated grid; **empty / no-search-match** (existing EmptyState — restyle);
  loading; long recipe name & long ingredient list (wrap, no truncation); add-to-plan
  busy + success (existing feedback — restyle).
- **Responsive:** `ResponsiveGrid` (min ~14rem) 1→2 col mobile, up to 4 col desktop.

## PlanPage.tsx — `/plan`
- **Reference:** mobile `mobile-03-plan.png`; desktop `desktop-02-plan.png`.
  **The reference art shows a 7-day week — treat any fortnight styling as illustrative
  only; the target is the current weekly planner.**
- **Current state:** **seven-day weekly** planner — `weekDays(weekStart)`,
  `weekEnd = addDays(weekStart, 6)`, `previousWeek`/`nextWeek`/back-to-this-week; dinner
  meals; add/edit/remove/replace via `RecipeSearchField`; keyboard move (Arrow ← →);
  weekly generation (`WeekPlanGenerator` / `proposeWeekMeals`).
- **Preserve (behaviour):** previous/next week navigation, seven day slots, add/edit/
  remove/replace, drag-and-drop **and** its keyboard equivalent, weekly generation.
- **Migratable now:** day rows/cells → `Card` + accent bar + neutral photo-frame thumb
  **[CSS]**; the generate action → **`Button variant="accent"` [SHARED]**; empty day →
  dashed slot (`--border-dashed-slot`) **[CSS]**.
- **[PRODUCT — FUTURE STORY]:** fortnight (14-day) grid, week-1/week-2 toggle, persistent
  meal locks. Propose separately; do not add here.
- **States:** populated; some days empty (dashed `+`); whole week empty (EmptyState +
  `accent` generate); loading/generating (busy); long meal names in a narrow cell (wrap).
- **Responsive:** 1-col day list (mobile) → 7-col week grid (desktop) with mono day
  headers. Not a scaled phone.

## ShoppingPage.tsx — `/shopping`
- **Reference:** mobile `mobile-07-shopping.png`; desktop `desktop-04-shopping.png`.
- **Current state:** items grouped by auto `ShoppingCategory`; complete/uncomplete toggle;
  pantry-aware reconciliation & put-away proposals. **No retailer/clipboard export.**
- **Preserve (behaviour):** list generation, category grouping, complete toggle &
  persistence, pantry reconciliation / put-away proposals.
- **Migratable now:** category group headers → mono **[CSS]**; item rows + checkboxes →
  forest/lime check **[CSS]**; pantry indicators as text/`Badge` (not colour-only)
  **[CSS]**; completed section restyle **[CSS]**.
- **[PRODUCT — FUTURE STORY]:** "Copy for Woolworths/Coles" clipboard export
  (`engineering/planned/cs41-…`). Do not add a copy/export action or assume one exists.
- **States:** populated grouped; checked/unchecked; partially-in-pantry (text indicator);
  **empty / nothing to buy** (reassuring EmptyState); loading; long item names.
- **Responsive:** single reading column mobile; centred column desktop (multi-column aisle
  layout would be `[PRODUCT — FUTURE STORY]`).

## PantryPage.tsx — `/pantry`
- **Reference:** mobile `mobile-08-pantry.png`; desktop `desktop-05-pantry.png`.
- **Current state:** search + filter drawer (`ListFilter`: location / availability /
  category selects); grouped by `pantryCategoryLabels`; each item has a boolean
  `available` (all / available / unavailable); add/edit staple with automatic
  categorisation; pantry insights (`Sparkles`).
- **Preserve (behaviour):** search, filter drawer + all three filters, category grouping,
  availability boolean, add/edit + auto-categorisation, insights, clear-filters.
- **Migratable now:** filter drawer / selects → Orchard fields **[CSS]**; category
  sections → Cormorant `h3` + list rows **[CSS]**; availability shown as a
  `Badge`/toggle (in-stock positive / unavailable neutral) **[CSS]**; insights →
  `Panel tone="feature"` **[SHARED]**.
- **[PRODUCT — FUTURE STORY]:** segmented multi-level stock bars and a "Confirm pantry
  check" action (availability is a boolean today). Do not build segmented stock.
- **States:** populated by category; empty (no staples); filtered-empty (clear-filters);
  loading; add/edit busy + validation; long staple names.
- **Responsive:** stacked category sections mobile; may sit 2-up desktop.

## GetAheadPage.tsx — `/get-ahead`
- **Reference:** mobile `mobile-04-get-ahead.png`; desktop `desktop-06-get-ahead.png`.
  **Reference art is a simplified checklist — reskin the real UI below, don't simplify
  the model.**
- **Current state:** duration presets (15/30/45/60/120 + custom 5–240); create session;
  task checklist with complete/reopen/skip/defer; user overrides (include/exclude);
  progress summary (`getAheadTotals`); end-early (`window.confirm`); localStorage;
  **task consolidation ("covers X") is real**.
- **Preserve (behaviour):** duration selection, session creation, all task transitions,
  overrides, progress summary, end-early, persistence, consolidation output.
- **Migratable now:** duration presets → chip/`Button` group **[CSS]**; task rows →
  `Card`/list row with the done state (forest box + lime check + accessible checked)
  **[CSS]**; "covers X meals" consolidation meta → mono line **[CSS]**; start/create →
  **`accent`** **[SHARED]**; progress summary restyle **[CSS]**. Replace `window.confirm`
  with the shared `Dialog` only if approved as **[PRODUCT]** — otherwise leave as-is.
- **States:** no session yet (duration picker + create); active session with tasks;
  all-done; no supported opportunities (existing EmptyState); loading; busy on create.
- **Responsive:** single reading column at all widths; generous spacing.

---

## System-level guidance for secondary flows

Adopt Orchard so the old system does not survive in corners. Rules + tokens suffice; no
full mock-ups required.

- **Settings (`SettingsPage.tsx`)** — `PageHeader` + `Card` sections (members, pending
  invitations); invite/remove use `secondary`/`quiet`; destructive remove =
  `--colour-error` + confirm `Dialog`. **[CSS]**.
- **Onboarding (`routes/onboarding/OnboardingPage.tsx`)** — welcome uses the
  `mobile-01-welcome.png` reference (blob monogram + all-caps wordmark, blob photo-frame,
  `accent` primary). Multi-step form uses form controls + `primary`/`secondary` step
  actions; progress via mono step labels (not colour-only). Preserve step logic and
  Supabase-backed completion. **[CSS]**.
- **Invitation acceptance (`InvitationAcceptancePage.tsx`)** — one focused `Card`: eyebrow,
  serif title, inviter, accept=`primary`, decline=`quiet`; expired/error via `ErrorState`.
  Preserve token/param handling. **[CSS]**.
- **Auth (`routes/auth/AuthPages.tsx`)** — tokens/type/buttons/fields only. **Do not touch
  auth flow, redirects, `returnTo`, or Supabase bootstrap** — those are behaviour.
  **[CSS]** only.
- **Not-found / route-error (`NotFoundPage.tsx`, error boundary)** — `ErrorState`, calm
  serif title, one recovery action; never expose stack traces (unchanged).
- **Shared dialogs & sheets** — inherit the `ModalSurface` restyle globally; no per-dialog
  styling. **[CSS]**.
- **Mobile bottom nav (6) & desktop rail (7)** — single source
  (`navigationItems.ts` + `navigation.css`): lime active indicator, blob monogram, mono
  labels, existing Lucide icons. **[CSS]**.
