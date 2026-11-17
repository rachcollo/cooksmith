# Cooksmith v2: four-reviewer review

**Reviewed:** `rachcollo/cooksmith` at `main` `17b9c47` (merge of PR #208, 10 Nov 2026). React 19 + Vite, Supabase (Postgres/RLS/Edge Functions), OpenAI enrichment, Vercel.
**Date:** 17 Nov 2026

## What this review is based on

- **Read:** all of `src/app`, the Plan, Shopping, Recipes, Home, Onboarding and Auth routes, all repositories, the shopping/meal-plan domain, the import and enrichment edge functions, and the migrations those depend on.
- **Ran:** `tsc` (clean), `eslint --max-warnings 0` (clean), `vitest` (108 files, 883 tests, all pass), `vite build` (succeeds), `npm audit --omit=dev`.
- **Probed:** seven suspected defects with throwaway tests against the real components and domain functions. Findings marked **[confirmed by probe]** reproduced; the probe file was removed and the clone is unchanged.
- **Not done:** no live browser session against a deployed build, no Playwright e2e run, no local Supabase/pgTAP run. Reviewer 4 is a trace of the flows through the code, not a hands-on session. Get Ahead and Admin internals were skimmed, not read line by line. RLS was sampled, not exhaustively audited. Auth findings cite `supabase/config.toml`; the hosted project may be configured differently.

---

## Reviewer 1: The Skeptic

The proposition is "Cooksmith quietly removes the invisible work of feeding a household". The plan → shop → cook loop breaks at each handover.

### Critical

**S1. The allergy promise is false, and "Plan my week" is a random shuffle.**
`src/routes/onboarding/OnboardingPage.tsx:341` tells the user "Allergies are treated as hard exclusions, not suggestions." `src/domain/meal-plans/weekGeneration.ts:17-24, 61-67` shuffles every non-archived recipe, including strangers' public ones, and assigns them to days. Allergies, dietary requirements, weeknight time limit, budget, skill and favourites are read nowhere outside onboarding and settings.
**Fix:** filter candidates by household allergens and dietary rules before proposing, and delete the "hard exclusions" sentence until that filter ships.

**S2. Every quantity field corrupts decimals. [confirmed by probe]**
`src/routes/ShoppingPage.tsx:518-523, 615-625, 778-783` bind `value={String(n)}` to `Number(event.target.value)`. Typing `1.5` stores **15**, `0.5` stores **5**, and a stray letter shows `NaN` in the field. The same `Number()` binding sits on the servings and time fields in `src/routes/RecipesPage.tsx:538-545, 921-927`.
**Fix:** hold the raw string in state and parse on submit, in one shared numeric-field component.

**S3. The in-store moment is the weakest link.**
Ticking one item sets a page-wide `saving` flag (`ShoppingPage.tsx:351`) that disables every other tick box (`:762`), then re-downloads the whole household (`:370`). There is no service worker, manifest or offline queue anywhere in `src/` or `public/`, so a dead spot in the supermarket rolls the tick back with an error banner.
**Fix:** make ticks optimistic per item with a local outbox that retries, and stop reloading the list after each one.

### High

**S4. "Replace my week" deletes what it says it will keep.**
`src/routes/meal-plans/WeekPlanGenerator.tsx:351` says "Prepared freezer reservations will be kept." `:284-288` then removes every dinner in the week, freezer-reserved and already-cooked ones included. The apply is 20-odd sequential browser calls (`:279-312`); a failure midway leaves a half-deleted week with no rollback.
**Fix:** move apply into one Postgres function that skips freezer and completed meals and runs in a single transaction.

**S5. Ingredient identity is a 16-word dictionary. [confirmed by probe]**
`src/domain/shopping/ingredientIdentity.ts:4-21` singularises only listed words, so `mushrooms` and `mushroom` are different products and never merge or match the pantry. `src/domain/shopping/planGeneration.ts:146-149` categorises by substring: chicken stock → Meat & seafood, eggplant → Dairy & eggs, black beans → Produce. The pantry hint only shows on one exact name match (`pantryMatching.ts:20-27`, `ShoppingPage.tsx:563`); "ambiguous" matches show nothing.
**Fix:** resolve ingredients to a canonical ingredient table at save time (the enrichment structure already exists) and key shopping, pantry and category off that ID.

**S6. Quick-add and auto-plan schedule dinners in the past. [confirmed by probe]**
`RecipesPage.tsx:458-462` starts the empty-day search at Monday of the current week; on a Thursday the recipe lands on Monday. `weekGeneration.ts:49-57` does the same for generated weeks.
**Fix:** start both searches from today.

**S7. One dinner per day is assumed but not enforced.**
`supabase/migrations/20260717120000_create_planned_meals.sql` has no unique constraint on household/date/meal type. `PlanPage.tsx:669` renders only the first meal found for a day, so a second one (two phones, a retried quick-add) is invisible yet still feeds the shopping list. `PlanPage.tsx:530-538` swaps two days with two independent updates.
**Fix:** add the unique constraint and a `swap_planned_meals` RPC.

**S8. A flaky connection at launch signs the user out.**
`src/application/auth/bootstrapAuth.ts:64-69` treats any `getUser()` error as an invalid session and calls `signOut`.
**Fix:** only sign out on an explicit 401/403; otherwise start from the cached session and revalidate in the background.

**S9. Recipe intelligence only advances when an admin acts.**
`src/infrastructure/recipes/supabaseRecipeRepository.ts:231-241` wakes `enrich-recipe` after a save, but `supabase/functions/enrich-recipe/index.ts:128-140` rejects anyone who is not an admin, and the client swallows the 401. No migration schedules a worker. As far as the repo shows, an ordinary household's recipes sit in the queue and Get Ahead answers `opportunities_not_ready_yet`.
**Fix:** drain the queue from a scheduled job with the worker token.

### Medium

**S10. Failures are hidden.** 29 bare `catch {}` blocks against 5 logger calls in `src/`. Load failures say "Try refreshing Cooksmith" with no retry button (`PlanPage.tsx:174`, `ShoppingPage.tsx:113`). A failed shopping load still renders "Your list is ready: add the first thing" under the error (`ShoppingPage.tsx:498, 533-544`). Feature-flag failures silently fall back to defaults (`FeatureFlagProvider.tsx:23-24`).
**Fix:** one error-reporting helper used in every catch, and a retry action on every load error.

**S11. The planner silently drops recipe links on a schema error.** `src/infrastructure/meal-plans/supabasePlannedMealRepository.ts:90-102, 194-221, 242-274` retries a failed write without the recipe columns.
**Fix:** delete the legacy fallbacks; the migrations are in the same repo.

---

## Reviewer 2: The Newcomer

### Where a first-time user abandons

**Onboarding step 3 of 5** (`OnboardingPage.tsx:183-256`): seven settings in one form, after two earlier steps and before the user has seen the product. Those who push through hit the second wall at the **Add dinner dialog** (N3).

### High

**N1. Sign-up can dead-end with no explanation.** The form hints "Use at least 10 characters" (`src/routes/auth/AuthPages.tsx:169`); `supabase/config.toml:68` also requires letters and digits. A rejected password is mapped to "Authentication could not be completed. Please try again." (`src/app/auth/authErrors.ts:12`), as is "already registered".
**Fix:** state the full rule in the hint and map weak-password and existing-account errors to specific messages.

**N2. Onboarding asks 14 questions and uses almost none.** Five steps (`OnboardingPage.tsx:119-123`), including a free-text IANA timezone field (`:96-102`). Weeknight limit, weekend limit, skill, budget, supermarket and planning day are consumed by nothing. The dietary step fails silently on invalid input (`:328`).
**Fix:** cut onboarding to household name plus allergies, and move the rest to Settings until a feature reads them.

**N3. "Save dinner" stays disabled after you type a dinner.** `PlanPage.tsx:1071` requires `choiceConfirmed`, which only flips when an option is picked from the dropdown (`MealSearchField.tsx:56-64`). Type "Tacos", tab to Date, and the button is dead with only a small hint.
**Fix:** treat typed text with no selection as a manual meal on submit.

**N4. The first screen explains nothing.** `AuthPages.tsx:36-38`: "Sign in to return to your calm fortnightly cooking plan." No description of the product, "fortnightly" contradicts the seven-day planner (`PlanPage.tsx:613`), and "Create an account" is the tertiary link (`:47`).
**Fix:** one sentence on what Cooksmith does and make account creation the primary action for signed-out visitors.

### Medium

**N5. Vocabulary shifts between screens.** "Pantry" / "household staples" / "staples" on one page (`PantryPage.tsx:426, 432, 480`). The nav says "Plan", the tab title says "Meal Planner" (`PlanPage.tsx:611`). "Put shopping away", "Include in this product's planned total" (`ShoppingPage.tsx:606`), "Get Ahead" and "household favourite" are never explained.
**Fix:** write a glossary of ten terms and enforce it in copy review.

**N6. Core actions are hidden behind gestures.** "Restock pantry" exists only on a 450 ms long-press of the Shopping tab (`src/app/navigation/PrimaryNavigation.tsx:34-38, 77-80`). Moving a dinner is drag or Alt+arrow only (`PlanPage.tsx:584-590`). The recipe card's `+` has no visible label and its result message is screen-reader-only (`RecipesPage.tsx:510-514, 802`).
**Fix:** give every gesture a visible button and show quick-add results as a visible toast with the date.

**N7. Pantry opens with the Freezer.** `PantryPage.tsx:434` renders the freezer panel above the summary and Add controls.
**Fix:** put the freezer below, or in its own tab.

**N8. Import asks "Public or Private" with Public pre-selected** (`RecipesPage.tsx:170, 665-691`), without saying it cannot be changed, edited or removed afterwards.
**Fix:** default to Private and state what Public means.

### Nice-to-have

**N9.** The footer says "Your household preferences stay private" (`RootLayout.tsx:108`) on an app whose imports default to public. Settings is reachable on mobile only through an unlabelled gear icon (`RootLayout.tsx:69-78`).
**Fix:** remove the footer line and label the account menu.

---

## Reviewer 3: The Code Checker

### Critical

**C1. Invitations are sent by issuing a magic-link login for someone else's email from the inviter's browser.**
`src/infrastructure/households/supabaseHouseholdPeopleRepository.ts:34-41` calls `auth.signInWithOtp({ email: invitee, shouldCreateUser: true })`. Any member can therefore make Cooksmith email an arbitrary address and create an auth account for it. The recipient gets `supabase/templates/magic-link.html` ("Use this secure link to continue to Cooksmith") with no inviter, household or the word "invitation", while the inviter sees "Invitation sent." (`SettingsPage.tsx:98`).
**Fix:** send invitations from an edge function with a dedicated template, and stop creating accounts on the invitee's behalf.

### High

**C2. The shared recipe bank is an unmoderated write path into every household.**
`supabase/migrations/20260718180000_url_recipe_imports.sql:55-61` lets any authenticated user insert a `public` recipe that every other user can read; there is no update policy for public rows and no delete policy at all. Sign-up is open (`supabase/config.toml:64`). The content is full third-party recipe text and hot-linked images scraped by `import-recipe`, republished to all users by default: a copyright and terms-of-use exposure as well as a spam one.
**Fix:** make imports private by default and gate publication behind admin approval.

**C3. Weekly-prep OpenAI spend has no cap.**
`weekly_preparation_settings` has `daily_plan_limit` and `monthly_cost_limit_aud` (`supabase/migrations/20260727220000_weekly_preparation_plans.sql:31-32`). `supabase/functions/generate-weekly-preparation-plan/index.ts:157` never selects them. The cache key includes `availableMinutes` (`:176`), so each value from 5 to 240 is a fresh model call, and `forceRetry` is passed straight through from any member (`get-weekly-preparation-plan/index.ts:412-434`).
**Fix:** enforce both limits in the generator exactly as `enrich-recipe/index.ts:177` does, and add a per-household daily count.

**C4. The shopping snapshot is unbounded and is the hottest query in the app.**
`supabase/migrations/20261007114403_stock_lifecycle_commands.sql:181-190` returns every shopping item, every planned meal ever, the whole pantry and every purchase, as full rows. It runs on Home (`HomePage.tsx:68`), on Shopping load, every 30 s and on every window focus (`ShoppingPage.tsx:160-161`), and after every tick. Recipes polls its whole library on the same timer (`RecipesPage.tsx:206-208`).
**Fix:** bound the snapshot to the active period and open items, and replace polling with Supabase Realtime or a version check.

**C5. There is no client data layer.**
The "providers" in `src/app/providers/AppProviders.tsx:90-142` only inject repositories. Every route refetches recipes, meals, pantry and freezer on mount and holds its own copy. `PlanPage.tsx` is one 1,081-line component with more than 20 state hooks; `AdminPage`, `RecipesPage` and `ShoppingPage` are 930–1,000 lines each.
**Fix:** adopt a query cache (TanStack Query) keyed by household and split each route into hooks plus presentational components.

**C6. Multi-step writes are orchestrated from the browser.**
Save dinner then reconcile shopping (`PlanPage.tsx:409-449`), apply a week (S4), swap days (S7) and refresh every meal using an edited recipe in a loop (`supabaseShoppingRepository.ts:500-501`) are each several unsynchronised requests.
**Fix:** one RPC per user action, transactional and idempotent, following the existing `record_shopping_stock_purchase` pattern.

### Medium

**C7. `import-recipe` SSRF hardening has gaps. [validator bypass confirmed by probe]**
The function never identifies the caller and has no entry in `config.toml`. Its rate limiter is an in-memory `Map` keyed on a hash of the auth header that is never evicted (`supabase/functions/import-recipe/index.ts:10-19, 101-108`). DNS is validated and then resolved again by `fetch` (`:33-51`), which permits rebinding. `urlSafety.ts:18-33` passes `http://[::ffff:127.0.0.1]/` because the URL parser rewrites it to hex form; only an incidental DNS failure stops it.
**Fix:** verify the user JWT, rate-limit per user in Postgres, parse IPs with a real library and fetch the validated address directly.

**C8. Sixty type-cast escapes in four repositories.** `as never` wraps RPCs that are present in the generated types (`supabaseShoppingRepository.ts:402, 431, 455, 466, 473`), and the snapshot JSON is cast without validation (`:127-144`) while its neighbours use zod.
**Fix:** remove the casts and parse every RPC result with a schema.

**C9. Optional repository methods fork every action three ways.** `repository.buy &&`, `setCompletedMany`, `loadPeriod ?` (`ShoppingPage.tsx:92-97, 356-381`) and `createFromPlan?.` (`PlanPage.tsx:445`) no-op silently when absent.
**Fix:** make the interface total and delete the fallback branches.

**C10. Production errors do not reach Sentry.** `AppErrorBoundary.tsx:23-33` only writes to the console, and `main.tsx:29` creates the root without React 19 error hooks; only `RouteErrorPage.tsx:19` reports. PostHog is initialised but no product event is captured anywhere.
**Fix:** wire `Sentry.reactErrorHandler` into `createRoot` and capture the five funnel events (signed up, onboarded, first recipe, first plan, first tick).

**C11. The entry bundle is 1.29 MB (400 kB gzip).** `src/infrastructure/observability/observability.ts:1-2` statically imports Sentry and PostHog even when both are disabled.
**Fix:** dynamic-import both after first paint.

**C12. No Content-Security-Policy.** `vercel.json:13-22` sets three headers. Recipe images load from any `http(s)` host (`RecipesPage.tsx:771`), which leaks users' IPs to third parties and allows mixed content.
**Fix:** add a CSP and proxy or re-host images through Supabase Storage.

**C13. The modal closes before the parent can veto. [confirmed by probe]** `src/components/ui/ModalSurface.tsx:50-57, 80` calls `dialog.close()` and then `onOpenChange(false)`. When the parent declines (`RecipesPage.tsx:520-522, 603-605`), state stays "open" with the dialog gone, and the Add button no longer reopens it. Sixteen `window.confirm` calls sit beside a perfectly good `Dialog` component.
**Fix:** ask the parent before closing, and replace `window.confirm` with a `ConfirmDialog`.

**C14. The design system stops at the tokens.** Colour is clean (no hex outside `tokens.css`), but `src/styles/components.css` is 2,996 lines with duplicated selector blocks, `.planned-meal` is redefined seven times across two files, there are 12 distinct breakpoints and no breakpoint tokens, and classes cross domains (`pantry-card` on recipe cards at `RecipesPage.tsx:761`, `pantry-form` on the dinner form at `PlanPage.tsx:961`, `meal-remove` on Replace and Edit at `:794-815`).
**Fix:** split CSS per component, define four breakpoint tokens, and rename shared classes to neutral primitives.

### Nice-to-have

**C15.** `npm audit` reports a high-severity react-router advisory (GHSA-qwww-vcr4-c8h2, RSC mode, fixed in 7.18.5) and a moderate fflate one. `src/application/api/apiClient.ts` is imported only by its test. `App.tsx:19` rebuilds the router on every render. `week.ts:2-13` defines the same formatter twice. Twenty migration lines exceed 300 characters, which makes the most sensitive SQL unreviewable.
**Fix:** bump react-router, delete dead code, memoise the router and format the SQL.

---

## Reviewer 4: The User

Traced from the code; see the scope note above.

### What works

- **Plan → Shopping reconciliation is automatic** when a recipe is planned, edited or replaced.
- **"Plan my week" previews before applying**, with per-day swap, replace and remove.
- **Purchases and put-away are idempotent** (operation IDs), so a double tap does not double-count.
- **Shopping is grouped by aisle category**, with a separate Done section.
- **Dialogs are native `<dialog>`** with focus return and Escape handling.

### Critical

**U1. Shopping in the shop.** See S2 and S3: you cannot tick two items in quick succession, and you cannot enter 1.5 kg.

### High

**U2. Adding a shopping item is too thin.** Quick-add takes a name and a quantity only (`ShoppingPage.tsx:506-525`): no unit, and the category is hard-coded to "Other" (`:37-42`), so everything typed by hand lands in one pile.
**Fix:** parse "2 L milk" from a single field and auto-categorise with the same function recipes use.

**U3. Finished items never leave.** "Completed items stay below until you remove them" (`ShoppingPage.tsx:540`): one at a time, each behind a browser confirm (`:448`).
**Fix:** add "Clear done" and auto-archive after put-away.

**U4. Getting a recipe onto a specific day takes too many steps.** From Recipes, `+` picks the date for you and tells you only via a hidden status (S6, N6). From Plan it is Add dinner → type → pick from dropdown → Save. The recipe detail dialog has no "Add to plan" (`RecipesPage.tsx:879-890`).
**Fix:** put a day picker on the recipe card and detail (two taps), and let an empty day open the recipe list directly.

**U5. Declining "Discard changes?" discards the dialog anyway.** See C13; the draft survives in memory but the user cannot get back to it.

### Medium

**U6. Plan is hard to scroll on a phone.** `.planned-meal` sets `touch-action: none` (`src/styles/components.css:1493`), so a finger that lands on a dinner card cannot scroll the page.
**Fix:** restrict drag to the grip handle.

**U7. "Replace" swaps in a random recipe instantly** with no confirm or undo (`PlanPage.tsx:488-522`), in the same menu where Remove asks for confirmation.
**Fix:** show an undo toast for both and drop the confirm.

**U8. Imported recipes are frozen.** Edit and Archive render only for household recipes (`RecipesPage.tsx:880-889`), and private imports cannot be favourited (`:218`).
**Fix:** allow owners to edit, archive and favourite their imports.

**U9. Recipe search matches names only** (`RecipesPage.tsx:276-283`); no ingredient or tag search, no "what can I make from the pantry", no serving scaling.
**Fix:** search name, tags and ingredients, and add a pantry-match sort.

**U10. Dinner is the only meal.** `mealType: 'dinner'` is hard-coded throughout (`PlanPage.tsx:75, 148`), so lunches and snacks never reach the list.
**Fix:** decide whether this is a deliberate scope limit and say so in the UI.

**U11. Feedback appears far from the action.** Errors are a banner at the top of the page (`PlanPage.tsx:652-656`, `ShoppingPage.tsx:498`); successes are often screen-reader-only.
**Fix:** one toast system for success, error and undo.

### Nice-to-have

**U12.** The list cannot leave the app: no share, copy, print or supermarket hand-off (the Woolworths deep-link from the prototype is not in v2).
**Fix:** add "Copy list" and "Share" first; supermarket links after.

---

## Synthesis: what to fix before shipping, in order

**Stop-ship (correctness, safety, security)**

1. **Allergy claim**: filter generation by allergens or remove the promise (S1).
2. **Numeric inputs**: shared field that preserves decimals (S2).
3. **Invitations**: server-sent, dedicated template, no third-party account creation (C1).
4. **Shared recipe bank**: private by default, moderated publication, owner delete (C2, N8).
5. **OpenAI cost caps** on weekly prep (C3).
6. **"Replace my week"**: transactional RPC that actually preserves freezer and cooked meals (S4, C6).
7. **Modal veto bug** and replace the 16 `window.confirm` calls (C13, U5).

**Core loop (the reason the app exists)**

8. **Shopping tick path**: per-item optimistic updates, offline outbox, no full reload (S3, U1).
9. **Bounded snapshot + realtime** instead of 30 s polling (C4).
10. **Canonical ingredient identity** driving merge, category and pantry match (S5).
11. **Dates**: never schedule into the past; unique dinner per day; atomic swap (S6, S7).
12. **Enrichment worker on a schedule** so Get Ahead works for non-admin households (S9).

**First-run**

13. **Sign-up errors and password rule** (N1); **welcome copy** (N4).
14. **Onboarding cut to two questions** (N2).
15. **Add dinner** accepts typed text; **recipe → day** in two taps (N3, U4).

**Foundations (do alongside, one route at a time)**

16. **Query cache and route decomposition**, starting with Shopping (C5).
17. **Total repository interfaces, no casts, no legacy fallbacks** (C8, C9, S11).
18. **Error reporting and funnel analytics** (C10, S10); **resilient session restore** (S8).
19. **CSP, image proxying, bundle split, dependency bump** (C11, C12, C15).
20. **CSS split, breakpoint tokens, neutral class names, glossary** (C14, N5).
