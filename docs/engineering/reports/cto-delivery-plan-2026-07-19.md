# CTO delivery plan: friend test and rebuild roadmap, 19 July 2026

Companion to the [CTO codebase review](cto-codebase-review-2026-07-19.md). This plan assumes no human engineering oversight: one operator directing AI coding agents, with the automated quality gates as the only engineering safety net. The immediate goal is a friend test within days to validate the product offering.

## Guiding decisions

1. **Validate with what exists, plus exactly one new feature.** The only feature standing between the current build and a meaningful validation is CS-22, generating the shopping list from the meal plan. Without it the friend test validates a recipe notebook, not the product promise. Everything else ships as-is.
2. **No refactors before validation.** Every refactor in this plan is deliberately scheduled after friends are in the product. Refactoring a product that may pivot is waste; the codebase review confirmed nothing existing blocks the test.
3. **Replace the missing human engineer with standing automated controls.** AI review passes on every PR, a core-journey end-to-end test, error monitoring and the existing adversarial database suite together form the compensating control set. They are part of Phase 0, not optional extras, because without them nobody notices when the friend test breaks.

## Phase 0: launch blockers (days 1 to 2)

Work items in dependency order. B1 and B2 are operator tasks; B3 to B5 are agent build tasks that can run in parallel with them.

| #   | Item                                    | What and why                                                                                                                                                                                                                                                                                                                                                                                                                                          | Size                 |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| B1  | Hosted auth email                       | Configure Resend SMTP in the Supabase dashboard for production (domain already planned as `smillins.com.au`, must be verified in Resend), set confirmation/magic-link/recovery templates and redirect URLs, then run the hosted smoke check in `docs/engineering/v2/authentication.md`. Friends cannot sign up until this works.                                                                                                                      | Hours, operator      |
| B2  | Production release sync and backups     | Release all pending migrations and the `import-recipe` Edge Function through the protected workflows, run deployment verification, and confirm backups (or PITR) are enabled on the production Supabase project before any friend enters real household data.                                                                                                                                                                                         | Hours, operator      |
| B3  | CS-22 thin slice: plan to shopping list | One action on the shopping page: "Add this week's meals to the list". Pull ingredient rows from planned meals' linked recipes, insert as list items with provenance recorded, naive duplicate handling (same normalised name merges), everything editable afterwards. Deterministic only, no unit conversion cleverness. Includes pgTAP coverage for the new access paths and integration tests. This is the magic moment the test exists to measure. | 1 to 2 days, agent   |
| B4  | Observability minimum                   | Error monitoring (Sentry free tier) wired into the existing error boundary and logger, plus product analytics (PostHog free tier) with a small fixed event set: sign-up, onboarding completed, recipe created, recipe imported, meal planned, list generated, item checked off, return visit. These are the instruments that make the success criteria measurable. Both are free tiers; record the cost-approval note per `AGENTS.md`.                | Half day, agent      |
| B5  | Core-journey e2e test                   | One Playwright journey against the local stack in CI: create account, complete onboarding, add a recipe, plan a meal, generate and check off the shopping list. The current e2e suite covers the auth shell only. With no human reviewer, this test is the closest thing to an engineer confirming the product still works before every deploy.                                                                                                       | Half to 1 day, agent |
| B6  | Dress rehearsal                         | The operator runs the full journey on a phone against production as a brand-new user, including the email flows. Fix whatever breaks; nothing ships to friends until this passes cleanly.                                                                                                                                                                                                                                                             | Hours, operator      |

Explicitly not in Phase 0: retailer export copy, meal prep plan, AI plan generation, images, search, pagination, any refactor. The friend test runs without them.

## Phase 1: friend test operations (days 3 to 10)

- **Cohort:** 5 to 10 friendly households. Set expectations in the invite: private MVP, things may break, data may be reset, feedback is the product.
- **Onboarding kit:** a short "what to try" note mirroring the weekly journey (set up your household, confirm your pantry, add or import three recipes, plan the week, generate the list, take it shopping), plus one obvious feedback channel (a group chat and a short form both work; pick what friends will actually use).
- **Daily triage, 30 minutes:** Sentry issues, Supabase logs and advisors, analytics funnel, feedback channel. Hotfixes go through the normal branch and PR flow with the AI review gates; no direct-to-main work, no refactoring mid-test. One change stream at a time during test week; high commit velocity is a liability while friends are live.
- **What validation means, decided before the test starts:**
  - Activation: household completes onboarding and plans at least five meals.
  - Core value: household generates a shopping list and actually shops from it.
  - Retention: household comes back and plans the following week unprompted.
  - Qualitative: they would be disappointed if it disappeared, and can say why.
- If most households stall at the same step, that step is the product problem; fix and re-run before concluding anything.

## Phase 2: stabilise and refactor (weeks 2 to 3, while signal accumulates)

The rebuild/refactor backlog from the codebase review, in execution order. Each item is a scoped agent task with the standing controls applied.

1. **Server-state layer.** Adopt TanStack Query and migrate the five data pages (recipes, plan, pantry, shopping, settings) off hand-rolled `useEffect` fetching. Removes the largest source of duplicated state logic and future staleness bugs. Do this before any new feature work so new features are written on the new pattern.
2. **Decompose the monolith routes.** Split `RecipesPage` (745 lines), `PlanPage` (655), `PantryPage` (571) and `ShoppingPage` into feature components with extracted dialog and draft state. Done page by page, immediately after that page is migrated in item 1, while the agent context is warm.
3. **Close the `imported_recipes` typing gap.** Regenerate database types to cover the table, delete the `as never` casts in the recipe repository, and replace the two-query client-side merge with a single database view or RPC.
4. **Small smells sweep.** Replace `JSON.stringify` dirty checks with field comparison, replace `window.confirm` with the existing Dialog primitive, consolidate the Postgres error-code mapping.
5. **Edge Function hardening.** Durable rate limiting (Postgres counter keyed on user id, not an in-memory map) and CORS pinned to the application origin. Required before the audience widens beyond friends.
6. **Dependency scanning.** Enable Dependabot security updates and add an audit gate to CI. With no human watching advisories, this must be automated.
7. **Reinstate staging.** Hosted staging Supabase project plus the preview flow, so widening the beta does not test in production. Already committed to in the README; schedule it here.
8. **List scalability basics.** Pagination or windowing on recipes and pantry once real libraries exist; PostgREST `max_rows` is a backstop, not a UX.
9. **Process consolidation.** Pick the `engineering/` lifecycle-folder convention as the single engineering-package home, fold `Cooksmith_Delivery_Orchestrator/` and stray top-level docs into the documented hierarchy, and prune documentation the agents must keep consistent. A 1:1 docs-to-code ratio is a maintenance liability when agents are the maintainers.

## Phase 3: roadmap re-scope after validation (week 3 onward)

**If the test validates**, do not resume the roadmap in numeric order. Milestones 10 to 18 (canonical ingredients, file storage, chef attribution, public recipe engine and search, seeded recipes, admin console, bulk import) are infrastructure for a product at scale, not for the next validation question. The next question is whether the intelligence is valuable, so the order becomes:

1. **Retailer export (from milestone 21):** the Coles/Woolworths copy export is an MVP objective, uniquely valuable in the AU market, and small now that the list exists.
2. **Thin AI slice (from milestones 23 to 24):** AI-assisted fortnight generation as a proposal the household confirms, with allergies, pantry and permissions enforced deterministically outside the model per the product principles. Build the smallest reviewable slice: "suggest a fortnight from my recipe library", nothing more.
3. **Deterministic planning rules (milestone 20)** as needed to make suggestions sensible.
4. Everything else waits for the signal those three generate.

**If the test does not validate**, the foundation (auth, households, RLS, design system, CI) is product-agnostic and reusable; the pivot cost is product surface, not platform. That is the payoff of the current architecture, and a reason not to gold-plate features before signal.

## Standing controls: operating without a human engineer

These are permanent rules, not one-off tasks:

- Every PR gets an AI security review and code review pass at high effort before the operator merges. The operator never overrides a failing governance or quality check; a red check means "ask the agent to fix it".
- The core-journey e2e test (B5) must be green before anything deploys; it is the regression net for every future change.
- Every new table ships with pgTAP tenant-isolation coverage in the same PR, keeping the adversarial suite the crown jewel it currently is.
- Weekly, 30 minutes: Supabase advisors, Sentry review, Dependabot merge round.
- Production database and Edge Function releases stay behind the existing SHA-locked, confirmation-phrase workflows, always for a reviewed merged commit.
- Deterministic control of allergies, permissions and calculations is a hard architectural boundary; no future AI feature may decide those, only propose within them.

## Summary timeline

| When          | Focus                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Days 1 to 2   | Phase 0 launch blockers: email, production sync and backups, CS-22, monitoring, core e2e, dress rehearsal |
| Days 3 to 10  | Friend test live: daily triage, hotfixes only, measure the four validation signals                        |
| Weeks 2 to 3  | Phase 2 refactors in order, while the test continues                                                      |
| Week 3 onward | Re-scoped roadmap: retailer export, thin AI slice, deterministic rules; defer milestones 10 to 18         |
