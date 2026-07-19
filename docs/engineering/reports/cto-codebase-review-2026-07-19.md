# CTO codebase review, 19 July 2026

A full-repository review of Cooksmith v2 covering product state, delivery model, code quality, security, UX, scalability and refactoring opportunities. Written for an incoming CTO. Findings were verified against the working tree at commit `3f597ea`; lint (zero warnings), the full TypeScript build check and all 142 Vitest tests were run locally and pass.

## 1. What this product is, and where it actually is

Cooksmith is a household meal planning assistant for the Australian market ("quietly removes the invisible work of feeding a household"). The MVP promise: households onboard, keep a pantry, hold a recipe library, plan a fortnight of meals, and generate a shopping list with Coles/Woolworths export. The long-term differentiator is AI-assisted planning under a clear philosophy: "AI proposes. The household decides," with deterministic logic controlling allergies, permissions and calculations.

Current delivery position against the 28-milestone roadmap:

- **Built and working:** application shell, authentication flows, onboarding and household bootstrap, household invitations and membership roles, pantry foundation, recipe library (manual authoring plus URL import via an Edge Function), a fortnight meal planner with drag-and-drop and recipe linking, and the shopping list foundation (CS-21, merged the day before this review).
- **Not started:** canonical ingredients and units, file storage and images, public recipe engine and search, admin console, deterministic planning rules, retailer export, meal prep engine, and the entire AI platform (milestones 23 to 26). The differentiating intelligence in the product promise does not exist yet; what exists today is a well-built CRUD foundation.

The repository is seven days old (first commit 12 July 2026) with roughly 300 commits, peaking at 125 commits in a single day.

## 2. The team, honestly

There is no engineering team in the conventional sense. Every commit is authored by one account, and the repository is explicitly organised as an "AI engineering operating system": a non-engineer operator directs AI coding agents (Codex/Claude) through Jira stories and repository "engineering packages", with governance automation (PR title/branch Jira-key checks, migration declarations, Jira status sync) and human approval gates for merges and production database/Edge Function releases. The `docs/operations/OPERATOR_GUIDE.md` is written in plain language for a non-engineering operator.

What this means for you as CTO:

- **The process is the engineering capability.** The maturity you see (and it is genuinely high, see below) lives in documentation, CI gates and adversarial tests, not in human heads. If the operating system degrades, there is no engineering culture to fall back on.
- **Review depth is structurally limited.** At 125 commits/day, human review of AI output is necessarily shallow. The compensating controls (pgTAP adversarial RLS tests, zero-warning lint, generated-type freshness checks, axe accessibility scans) are well chosen, but they verify what they test, not what they don't.
- **Bus factor is one.** Operator, product owner, approver and release manager are the same person.

Recommendation: institute an independent senior engineering audit cadence (fortnightly or per release checkpoint) focused on the things automation cannot check: architectural drift, subtle data-model mistakes, and security assumptions. This report is a first instance of that pattern.

## 3. Architecture and code quality

**Stack:** React 19 + TypeScript (strict) + Vite, React Router 7, Zod 4, Supabase (Postgres 17 with RLS, Auth, Edge Functions), Vercel hosting. Only six runtime dependencies, all pinned exact. This is a modern, small, low-lock-in surface and a real strength.

**Structure:** a clean layered layout (`domain` for framework-free rules, `application` for ports/use-cases, `infrastructure` for Supabase adapters, `app` for providers/routing, `routes` for pages, `components/ui` for a small primitive library). Repository interfaces are injected through React context providers, so pages depend on ports, not Supabase. Domain validation is Zod-schema driven. Database types are generated and CI fails if they are stale. For a week-old codebase this is disciplined and consistent; naming, formatting and idiom are uniform throughout.

**Verified quality baseline:** `eslint --max-warnings 0`, `tsc -b`, and 142 unit/integration tests all pass. CI additionally runs a full local Supabase rebuild, schema lint, 14 pgTAP suites (including a tenant isolation matrix and JWT/helper security suite), Playwright smoke tests with axe accessibility checks, and a production build, on every PR.

**Complexity hotspots and refactoring opportunities** (none urgent, all worth scheduling before the planner/shopping milestones deepen):

1. **Route components are becoming monoliths.** `RecipesPage.tsx` (745 lines), `PlanPage.tsx` (655 lines, including hand-rolled pointer-event drag-and-drop), `PantryPage.tsx` (571), `ShoppingPage.tsx` (429). Each manages 10 to 18 `useState` hooks covering list data, dialogs, drafts, field errors and loading/saving flags. This pattern is at its comfortable limit now; the next planner milestones will blow past it. Decompose into feature components and extract dialog/draft state machines.
2. **No server-state layer.** Every page fetches with `useEffect` + `useState` and hand-rolls loading/error/refresh. There is no caching, no request deduplication, no optimistic update convention. Adopting TanStack Query (or equivalent) before the meal planner and shopping list get interactive-heavy would remove a large amount of repeated code and future bugs.
3. **Type-system escape hatches around `imported_recipes`.** `supabaseRecipeRepository.ts` casts the typed client through `as never` to reach the `imported_recipes` table, and merges two queries client-side with a re-sort. This is the one place the otherwise strict typing discipline is bypassed; it suggests the generated types or schema exposure lag the feature. Fix the generated-type coverage rather than living with casts.
4. **Minor smells:** dirty-checking via `JSON.stringify` equality (`recipesEqual`), `window.confirm` for discard prompts (inconsistent with the Dialog primitive used elsewhere), and error mapping keyed on raw Postgres error codes in the infrastructure layer (reasonable, but will need consolidation as tables multiply).

## 4. Security

This is the strongest area of the codebase, unusually so for a startup MVP.

- **Multi-tenancy:** every table carries RLS; helper functions (`is_active_household_member`, `has_household_role`) are `security definer` with pinned empty `search_path`, explicit `revoke`/`grant` discipline, and policy coverage is proven by an adversarial pgTAP tenant-isolation matrix plus a JWT/helper security suite that runs in CI and via `npm run db:test:security`.
- **Invitations:** tokens are stored as hashes with a uniqueness constraint, lifecycle state machine enforced by check constraints, expiry enforced, and one-active-household-per-user enforced by partial unique index. This is careful data modelling.
- **Environment safety:** the env parser refuses `VITE_`-exposed secrets by convention, forces preview builds onto hosted staging, and hard-fails any non-production build configured with a denied production Supabase project ref. Auth redirects sanitise `returnTo` (verified by an e2e test rejecting external URLs).
- **Recipe import Edge Function (SSRF surface):** validates scheme/credentials/port, blocks private and reserved IPv4/IPv6 ranges, re-validates DNS on every redirect hop (max 3), caps response size at 1.5 MB with streaming enforcement, 8-second timeout, and logs metadata only.
- **Release control:** production database and Edge Function releases are separate, SHA-locked, confirmation-phrase-protected GitHub workflows behind environment approval. Merging to main deploys the app only.
- No secrets found in the working tree; a secrets/env-file check script runs as part of engineering checks.

**Gaps to plan for (acceptable for a private MVP, not for public beta):**

1. The Edge Function's rate limiter is an in-memory `Map` per isolate: it resets on cold start and does not aggregate across instances. It is a speed bump, not a rate limit. Move to a durable counter (Postgres or KV) before public exposure.
2. The Edge Function sets `access-control-allow-origin: *`. JWT verification protects it, but pin CORS to the app origin before beta.
3. There is no dependency vulnerability scanning (no Dependabot/audit gate) and no runtime error monitoring, so a compromised or broken dependency would be discovered manually.
4. Everything rides on the `main` = production pipeline; the promised staging environment must be reinstated before real households and real data arrive (the docs already commit to this).

## 5. UX and product experience

- A coherent, calm design language: token-driven CSS (warm palette, serif display type, fluid type scale), a small consistent primitive library (Dialog, Sheet, Panel, form fields, empty/loading/error states), Australian English copy, mobile-first checks in e2e.
- Accessibility is engineered in, not bolted on: WCAG 2.2 AA target, `jsx-a11y` lint, axe scans failing CI on serious/critical issues, route announcer for screen readers, keyboard-focus e2e assertions, and a no-horizontal-scroll check at 320 px.
- Honest gaps: error messages are friendly but generic ("Try refreshing Cooksmith"); there is no offline or slow-network story for what is fundamentally a kitchen/shop-aisle product; and the product's stated success criteria (onboarding under 10 minutes, planning under 15) are unmeasurable because there is no analytics instrumentation at all. Observability is scheduled for milestone 27 of 28; that is far too late to learn anything from the friend test.

## 6. Scalability

- **Data layer:** the schema-per-tenant-row model with RLS scales fine for the target market; indexes are thoughtfully chosen (partial uniques, composite status indexes). PostgREST `max_rows = 1000` provides a backstop, but no UI pagination exists; recipe and pantry lists load entire result sets. Acceptable until real libraries grow.
- **Frontend:** no caching means every navigation refetches; combined with per-page effect fetching this will feel sluggish as data grows (see the TanStack Query recommendation).
- **Process scalability is the bigger question.** The governance stack (Jira keys, engineering packages, handover templates, per-PR full database rebuild in CI) is heavyweight for one operator, and drift is already documented: two parallel engineering-package conventions (`engineering/` lifecycle folders and `docs/engineering/packages/`), plus stray top-level directories (`Cooksmith_Delivery_Orchestrator/`, `engineering/`) that sit outside the documented `docs/` hierarchy. There are 107 markdown documentation files against 111 source files: a 1:1 docs-to-code ratio. The documentation is high quality, but every document is a maintenance liability the AI agents must be kept consistent with, and drift has appeared within the first week.
- **Roadmap realism:** roughly 9 of 28 milestones are done, and the remaining ones (canonical ingredients, search, admin, deterministic planning, retailer export, the entire AI platform) are the hard part. A week of foundations does not extrapolate; expect the back half to be several times slower, and the AI planning milestones to need product iteration, not just implementation.

## 7. Priority recommendations

1. **Add error monitoring and minimal product analytics now**, not at milestone 27. Without them the friend test measures nothing and production failures are invisible.
2. **Establish an independent senior-engineer audit cadence.** The automation is excellent at what it checks; a human needs to own what it cannot.
3. **Refactor before the planner deepens:** introduce a server-state library, decompose the four large route components, and remove the `imported_recipes` type-cast workaround.
4. **Consolidate governance drift:** pick one engineering-package convention, fold the stray top-level directories into the documented hierarchy, and consider trimming process weight to what one operator can sustain.
5. **Pre-beta security hardening list:** durable rate limiting and origin-pinned CORS on the Edge Function, dependency vulnerability scanning, and the staging environment reinstated.
6. **Re-scope the roadmap to the friend test.** Cut or defer everything not needed to answer the product question (does this reduce the mental load of feeding a household), and protect the DB security test discipline as the schema grows; it is the crown jewel of this codebase.

## 8. Bottom line

For a seven-day-old, AI-built codebase this is remarkable: layered architecture, strict typing, real multi-tenant security with adversarial tests, accessibility engineered in, and a verified green quality baseline. The risks are not in the code that exists; they are structural: a bus factor of one, review depth limited by AI velocity, no observability, a process stack heavier than the team carrying it, and a roadmap whose hard 70 per cent (including everything that makes Cooksmith "intelligent") is still ahead. Treat the foundation as an asset, treat the operating model as the thing to de-risk.
