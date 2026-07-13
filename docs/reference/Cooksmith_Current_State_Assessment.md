# Cooksmith Current State Assessment

**Deliverable:** 1 - Current State Assessment  
**Assessment date:** 13 July 2026  
**Repository:** `rachcollo/cooksmith`  
**Assessed branch:** `main`  
**Assessed commit:** `0ae700388520914eaa6b5c12710c3f431c85c385`  
**Commit description:** Improve mobile experience and meal planning

## 1. Executive Summary

Cooksmith is a working, attractive early MVP with enough capability to test the core proposition with a small group of friends. Users can authenticate, browse recipes, add personal recipes, manage a simple pantry, plan seven dinners, rearrange planned meals and generate a shopping list. Household data is stored in Supabase and protected with row-level security.

The architecture is deliberately lean: a React single-page application talks directly to Supabase from the browser and is deployed as a static Vite build through Vercel. That is a sensible starting point. There is no conventional application server or API layer yet.

The strongest parts are the focused scope, consistent Cooksmith voice, clear navigation, mobile-responsive presentation and sensible use of Supabase authentication and row-level security. The production build passes.

The application is not yet ready for a broad public launch. The most important blocker is its persistence approach. When recipes, pantry items or meal plans change, the client deletes the household's complete dataset for that feature and inserts it again. Failed inserts, concurrent sessions, two household members or two open browser tabs could overwrite or lose data. Database errors are mostly ignored, so a user may believe something was saved when it was not.

Other important gaps include hard-coded July dates, a meal plan that records weekdays rather than actual dates, no automated tests, a broken lint command, limited validation, no observability, no household invitations, no shared recipe database in Supabase and no protected server-side integration point for future AI features.

### Overall assessment

| Area | Assessment | Notes |
|---|---|---|
| Overall architecture | Appropriate for prototype | React, Supabase and Vercel are a strong lean foundation. A small server-side service boundary is needed for AI, imports and privileged administration. |
| Technology stack | Suitable | Modern, popular and well supported. Dependency versions need pinning. |
| Build maturity | Early MVP | Production build passes. Linting is configured as a script but cannot run. No tests or CI quality gates are present. |
| Code quality | Functional but concentrated | Clear enough for a prototype, but most UI lives in one large file and persistence logic is risky. |
| Friend-test readiness | Ready with guardrails | Suitable for a small, known test group after fixing data writes, dates and email delivery limits. |
| Public production readiness | Not ready | Data integrity, error handling, monitoring, accessibility, privacy operations and release controls need work. |

### Recommended immediate direction

1. Replace delete-and-reinsert synchronisation with row-level create, update and delete operations.
2. Change meal planning from weekday keys to real dates and support a rolling fortnight.
3. Add visible save and error states, plus recoverable errors.
4. Restore linting and add a small automated test suite around the highest-risk flows.
5. Move shared recipes from static source code into a public catalogue schema with chef and source attribution.
6. Add a server-side boundary before implementing recipe extraction, AI recommendations or bulk administration.

## 2. Overall Architecture

### Current architecture

```text
User browser
   |
   | Vite/React static application
   v
Vercel
   |
   | Supabase JavaScript client
   v
Supabase Auth + PostgreSQL + Row-Level Security
```

The frontend is a client-rendered single-page application. Vercel serves the built assets. The browser communicates directly with Supabase for authentication and data access. Shared starter recipes are compiled into the frontend bundle from `src/data.ts`; they are not stored in the database.

### Technology stack

| Layer | Current technology |
|---|---|
| UI | React and React DOM |
| Language | TypeScript |
| Build tooling | Vite |
| Styling | One global CSS file with responsive breakpoints |
| Icons | Lucide React |
| Drag and drop | dnd-kit core |
| Authentication | Supabase email magic link |
| Database | Supabase PostgreSQL |
| Data security | Supabase row-level security policies |
| Hosting | Vercel |
| Source control | GitHub |
| CI/CD | Vercel deployment from GitHub |

### Architecture strengths

- Low operational overhead and quick deployment.
- Supabase removes the need to build commodity authentication and database plumbing.
- Row-level security provides a sound base for household data isolation.
- Static hosting is fast, inexpensive and suitable for the current UI.
- The solution is small enough to change quickly while product assumptions are still being tested.

### Architecture limitations

- There is no trusted server-side layer for AI calls, recipe scraping, bulk import or administration.
- Business rules live inside React components and hooks.
- Static shared recipes require a code deployment for content changes.
- Client-side writes are destructive, coarse-grained and vulnerable to concurrency problems.
- There is no observability layer for frontend errors, database failures or user journey analytics.
- There is no defined migration pipeline beyond manually running SQL.

## 3. Build Maturity and Code Quality

### Verified build status

`npm run build` completed successfully on 13 July 2026. TypeScript compilation and the Vite production build both passed.

The generated JavaScript bundle is approximately 461 kB before compression and 133 kB compressed. This is acceptable for the current MVP, although route-level splitting may become useful as features grow.

### Quality tooling

`npm run lint` fails before checking any code because ESLint 10 expects an `eslint.config.js`, `eslint.config.mjs` or `eslint.config.cjs` file and none is present.

There are no discovered:

- unit tests;
- component tests;
- end-to-end tests;
- continuous integration workflows;
- automated accessibility checks;
- dependency vulnerability checks;
- release or rollback documentation.

### Code organisation

The code is understandable at MVP size, but `src/App.tsx` contains the application shell and almost every page, modal and card component. This increases the likelihood that unrelated changes interfere with one another.

State management uses local React state and a custom Supabase hook. That is appropriate for the present size. A global state library is not required yet. The next improvement should be cleaner feature boundaries and safer data operations, not introducing a large state framework.

### Dependency management

Every dependency in `package.json` uses `latest`. The lockfile gives current installations some repeatability, but future clean installations or deliberate upgrades can introduce breaking changes without warning. Use explicit compatible version ranges and update them intentionally.

## 4. Frontend Review

Cooksmith behaves as a single page with five tabs and several overlays. It does not use URL routing, so browser back, refresh persistence, direct links and deep linking are not supported.

### 4.1 Authentication

**Existing functionality**

- Email input and Supabase magic-link authentication.
- Busy, success and basic error messaging.
- Session persistence and automatic token refresh.
- Sign-out action from the avatar.
- Helpful configuration message when Supabase environment variables are missing.

**Missing functionality**

- Resend cooldown and friendly handling of email rate limits.
- Alternative authentication options.
- User profile, household name and household membership management.
- Household invitation or joining flow.
- Terms, privacy acknowledgement and account deletion pathway.

**UX and accessibility issues**

- Raw provider error messages are shown directly to users.
- The sign-out control relies on a title rather than a clear accessible label.
- There is no help route when a magic link fails or expires.
- Focus handling after authentication errors is not defined.

**Components and state**

- `Auth`, `Brand` and top-level session state in `App`.
- Local form state with a direct Supabase Auth call.

### 4.2 Home

**Existing functionality**

- Welcome hero and shortcut to the meal planner.
- Weekly plan summary.
- Quick recipe suggestions filtered to 25 minutes or less.
- Pantry summary and navigation.

**Missing functionality**

- Personalised greeting or household context.
- Actual current date and rolling planning period.
- Useful next actions based on incomplete setup.
- Recently used, favourite or recommended recipes.

**UX issues**

- The displayed date is hard-coded as Sunday, 12 July.
- The weekly summary counts weekday slots but does not identify the actual week.
- Quick wins are static rather than personalised.

**Components and state**

- `HomeView`, `SectionTitle`, `RecipeCard`.
- Receives all state through props.

### 4.3 Recipes

**Existing functionality**

- Twelve seeded recipes included in the frontend.
- Household-private personal recipes loaded from Supabase.
- Search across title and tags.
- Filters for All, Quick, Family, Veggie and Mine.
- Recipe cards and detail overlay.
- Source link, ingredients, method, time and serves.
- Add recipe to the next unplanned weekday.

**Missing functionality**

- Database-backed shared recipe catalogue.
- Recipe images, chef identity, chef photo and source attribution.
- Search by chef, ingredient, dietary preference or cooking style.
- Favourites, recently cooked and recipe history.
- Edit and delete for personal recipes.
- URL-based recipe import and structured extraction.
- Recipe sharing and household collaboration.
- Admin bulk import and content moderation workflow.
- Similar chef and recipe discovery.

**UX and accessibility issues**

- Adding a personal recipe captures only a title, optional URL and loosely formatted ingredient text.
- Personal recipe instructions default to a placeholder rather than storing the actual method.
- Ingredient input uses a custom `name | amount` convention that is easy to mistype.
- Recipe search has a placeholder but no explicit accessible label.
- The detail sheet has no dialog semantics, focus trap, escape handling or focus return.
- After using Add to next free night, the date itself is not shown and a full plan cannot be easily resolved from the recipe screen.

**Components and state**

- `Recipes`, `RecipeCard`, `RecipeDetail`, `AddRecipe`.
- Search, filter, overlay and form state are local.
- Recipe data combines static source-code records with household database records.

### 4.4 Pantry

**Existing functionality**

- Add pantry item with free-text amount.
- Mark item checked or unchecked.
- Delete item.
- Persist pantry records to Supabase.
- Pantry matching informs the shopping list.

**Missing functionality**

- Suggested standard Australian pantry list during onboarding.
- Categories, units, quantities and canonical ingredient matching.
- Edit action.
- Stock status, expiry, low-stock indicator or regular-item preference.
- Pantry setup completion and easy bulk selection.

**UX and accessibility issues**

- The meaning of the pantry checkbox is unclear.
- Delete controls do not have item-specific accessible labels.
- Free-text amounts reduce matching and aggregation quality.
- Pantry matching uses substring comparison and can produce false positives or miss common synonyms.

**Components and state**

- `Pantry` and reusable `Empty` state.
- Local input state with the pantry array managed by `useCooksmithData`.

### 4.5 Meal Plan

**Existing functionality**

- Seven weekday slots.
- Add a recipe from a select control.
- Add from recipe detail to the next available slot.
- Pointer and touch drag-and-drop reordering.
- Swap behaviour when dropping on an occupied day.
- Remove and open a planned recipe.
- Persist plan records to Supabase.

**Missing functionality**

- Rolling fortnight view agreed in the product direction.
- Actual dates, week navigation and historical plans.
- Breakfast, lunch or flexible meal slots if later required.
- Leftovers, eating out, takeaway and free-text meal entries.
- Copy previous week or repeat regular meals.
- Servings per planned meal.
- Optimistic save status and conflict handling.

**UX and accessibility issues**

- Dates are hard-coded to 13 to 19 July.
- Data is keyed only by Mon to Sun, so it cannot distinguish this week from next week.
- Keyboard drag-and-drop support is not configured.
- The recipe select has no explicit accessible label.
- On small screens, drag can still compete with scrolling despite touch activation constraints.

**Components and state**

- `Planner` and `PlanDay`.
- dnd-kit pointer and touch sensors.
- Plan stored as `Record<string, string>` keyed by weekday abbreviation.

### 4.6 Shopping List

**Existing functionality**

- Generates ingredients from planned recipes.
- Combines duplicate ingredient names.
- Flags items that may already be in the pantry.
- Allows items to be checked off during the session.

**Missing functionality**

- Persisted shopping list state.
- Clear grouping by category or supermarket aisle.
- Normalised quantity calculation and unit conversion.
- Manual items and household collaboration.
- Copy-ready list for Coles and Woolworths, as agreed.
- Share through the device share sheet.
- Exclude confirmed pantry items and restore them if required.

**UX issues**

- Duplicate amounts are concatenated as strings, for example `1 + 2`, rather than calculated.
- Checked state disappears after navigation or refresh.
- Ingredient grouping is case-sensitive at the map stage.
- There is no one-tap copy action for online grocery shopping.

**Components and state**

- `Shopping`, `Empty` and shared list styles.
- Ingredient list is derived with `useMemo`; checked state is local only.

### 4.7 Navigation and responsive behaviour

**Existing functionality**

- Clear five-item bottom navigation.
- Sticky header and persistent mobile navigation.
- Responsive grids, mobile recipe cards and horizontally scrolling quick wins.
- Safe-area padding for devices with home indicators.

**Missing functionality**

- URL routes, deep links and browser history.
- A profile/settings destination.
- Admin navigation for content management.

**UX and accessibility issues**

- Reloading resets the selected tab to Home.
- Browser back does not close overlays or return to the previous page.
- Some icon-only controls lack complete accessible names.
- Modal focus containment and reduced-motion support are absent.

## 5. Backend Review

Cooksmith currently has no standalone backend service. Supabase Auth, PostgreSQL, database functions and row-level security provide backend capabilities, while the React client performs queries and business logic directly.

### APIs

- Supabase-generated database APIs are used through `supabase-js`.
- Authentication uses `signInWithOtp`.
- There are no custom REST endpoints, Supabase Edge Functions or serverless Vercel functions.
- There is no API contract, schema validation layer or versioning strategy.

### Business logic

Business rules currently live in frontend code:

- next free meal slot selection;
- drag-and-drop swapping;
- pantry ingredient matching;
- shopping list generation;
- mapping database rows into frontend recipe models;
- complete collection replacement during persistence.

This is acceptable for presentation logic. Rules involving data integrity, AI, imported external content, shared catalogues or administration should move behind a trusted server-side boundary or into transactional database functions.

### Validation

Current validation is minimal:

- Authentication requires a browser-valid email field.
- Recipe creation requires only a non-empty title.
- Pantry creation requires a non-empty name.
- Database checks ensure recipe time and serves are positive and meal-plan day keys are allowed.

Missing validation includes URL safety, string length limits, ingredient structure, recipe completeness, allowed colours and tags, duplicate records, malicious or malformed imported content and structured request validation.

### Authentication and authorisation

Strengths:

- Supabase manages sessions and token refresh.
- RLS is enabled on all application tables.
- Policies restrict household data using `my_household_id()`.
- Recipe insertion requires `created_by = auth.uid()`.

Limitations:

- Every new user receives a new household. There is no invitation or household joining process.
- Profiles can only be selected by the owning user, which does not yet support viewing household members.
- Household records cannot be updated under current grants and policies.
- There are no explicit owner or member roles.
- No administrative role exists for shared recipe management.

### Error handling

- Authentication errors are displayed.
- Initial profile load failure stops the loading state but gives the user no explanation or retry.
- Recipe, pantry and meal-plan fetch errors are not surfaced individually.
- All persistence errors are ignored.
- There is no rollback if a delete succeeds and a subsequent insert fails.
- There is no global error boundary, logging service or retry strategy.

The user can therefore see successful-looking local state even when persistence has failed.

## 6. Database Review

### Current schema

| Entity | Purpose | Key relationships |
|---|---|---|
| `households` | Tenant boundary for private data | One household has many profiles, recipes, pantry items and meal-plan items |
| `profiles` | Application profile for an authenticated user | Primary key references `auth.users`; belongs to one household |
| `recipes` | Household-private personal recipes | Belongs to household and creator; ingredients, method and tags stored as JSONB |
| `pantry_items` | Household pantry entries | Belongs to household |
| `meal_plan_items` | One planned dinner per weekday | Belongs to household; recipe identifier stored as text |

### Relationship assessment

- Household foreign keys use cascading deletion appropriately.
- User profiles correctly reference Supabase Auth users.
- Personal recipes reference their creator.
- `meal_plan_items.recipe_id` is text rather than a foreign key. This permits static recipe IDs such as `r1`, but provides no referential integrity for personal recipes.
- The meal plan has no actual date or planning-period entity.
- There is no way to represent a shared database recipe separately from a household recipe.

### Missing entities

Required or likely for the agreed roadmap:

- `shared_recipes`
- `chefs`
- `recipe_sources`
- `recipe_ingredients` or structured ingredient records
- `ingredients` or canonical grocery items
- `meal_plans` and date-based `meal_plan_items`
- `household_invitations`
- household membership roles, either on profiles or a dedicated membership table
- `household_preferences`
- `dietary_preferences`
- `standard_pantry_items`
- `shopping_lists` and `shopping_list_items`
- `favourites` or saved recipes
- recipe import jobs and import audit status
- recommendation feedback or events, once AI personalisation is introduced

Not all of these should be built immediately. The data model should support the next validated product slice without creating an imaginary enterprise platform.

### Normalisation

The current JSONB approach for tags, ingredients and method is pragmatic for a prototype. It becomes limiting when Cooksmith needs to:

- search reliably by ingredient;
- calculate and combine quantities;
- map items to supermarket-friendly names;
- apply dietary or allergen filters;
- recommend recipes based on pantry contents;
- analyse common ingredients across recipes.

Recommended direction:

- Keep recipe method steps as ordered JSONB or a child table depending on editing needs.
- Normalise canonical ingredients and recipe ingredient quantities.
- Use a controlled tag table or validated tag values once catalogue search expands.
- Separate shared recipe content from household-private recipes while exposing a common read model to the UI.

### Indexes

Primary keys and the unique constraint on `(household_id, day_key)` create indexes. Additional indexes are needed for common filters and joins:

- `profiles(household_id)`
- `recipes(household_id)`
- `recipes(created_by)`
- `pantry_items(household_id)`
- `meal_plan_items(household_id)` once redesigned around dates
- future shared recipe chef, status, visibility and searchable text fields

PostgreSQL does not automatically create indexes for referencing foreign-key columns. The current dataset is tiny, so this is not a present performance problem, but it should be corrected before meaningful growth.

### Future scalability

Supabase PostgreSQL can comfortably support early product growth. The primary scaling risks are application design rather than database capacity:

- full-table delete and reinsert writes;
- lack of pagination for recipe catalogues;
- client-side loading and filtering of every recipe;
- JSONB ingredient search and aggregation;
- missing indexes;
- no background job mechanism for recipe imports or AI enrichment;
- no caching strategy for public catalogue content.

## 7. AI Readiness

### Current position

There is no AI integration, prompt management or model abstraction. The frontend-only architecture must not call an AI provider directly because API keys and privileged operations would be exposed to the browser.

The current data is also not structured enough for dependable pantry matching, grocery aggregation or dietary filtering. AI should improve convenience and discovery, not be asked to compensate for avoidable data-model ambiguity.

### Where AI should plug in

Good early AI use cases are:

1. Extract a structured personal recipe from a supplied URL or pasted text.
2. Suggest recipes based on household preferences, available pantry items, time and planned meals.
3. Recommend similar chefs or recipes with a short, transparent reason.
4. Clean and map ingredient names to canonical grocery items.
5. Help an administrator review bulk recipe imports and flag incomplete attribution.

AI should not silently provide medical nutrition advice, infer allergies, alter source recipes without disclosure or fabricate chef attribution.

### Architecture changes required

```text
React client
   |
   | Authenticated request
   v
Server-side function or API
   |-- validates request and user
   |-- applies rate limits and usage controls
   |-- retrieves trusted Cooksmith data
   |-- calls selected AI model
   |-- validates structured response
   |-- records provenance and failures
   v
Supabase PostgreSQL
```

For the current stack, Supabase Edge Functions or Vercel Functions are both reasonable. Select one server-side execution environment initially to avoid duplicated operational patterns.

Required foundations:

- server-side secrets only;
- authenticated and authorised endpoints;
- request and response schemas;
- rate limiting, timeouts and retry rules;
- structured output validation;
- prompt version tracking;
- source attribution and provenance;
- cost and latency logging;
- human confirmation before imported content is published or added to a household;
- evaluation examples for extraction and recommendations.

### Prompt strategy

- Use narrow prompts for one job at a time.
- Supply structured recipe, household and pantry context rather than long conversational history.
- Require structured JSON outputs validated against a schema.
- Separate system rules, Cooksmith editorial rules and user-provided content.
- Treat websites and pasted recipes as untrusted data, not instructions.
- Ask the model to identify uncertainty and missing fields.
- Preserve original source and chef attribution.
- Keep nutrition-related language factual and permission-giving, with clear boundaries around medical advice.
- Version prompts and test them against a stable evaluation set before changing production behaviour.

### Model abstraction

Avoid embedding provider calls throughout the application. Introduce one small internal interface, for example:

- `extractRecipe(input)`
- `recommendRecipes(context)`
- `normaliseIngredients(items)`

Each operation should define its own typed input, output and validation schema. Provider selection, model name, timeout and retry behaviour should live in server-side configuration. This gives Cooksmith the ability to change models without rewriting product logic, while avoiding an over-engineered universal AI framework.

## 8. Technical Debt Register

### Critical

| Item | Impact | Recommended action |
|---|---|---|
| Delete-all then reinsert persistence | Data loss and last-write-wins overwrites across devices, tabs or household users | Replace with row-level insert, update, upsert and delete operations. Use transactions or database functions for multi-record changes. |
| Persistence errors ignored | Users can believe data is saved when it is not | Return operation results, display save failures and retry safely. Add logging. |
| Meal plan keyed only by weekday | Plans cannot represent real weeks or a fortnight and will overwrite the same seven slots forever | Store `planned_date` and use a date-based unique constraint. |

### High

| Item | Impact | Recommended action |
|---|---|---|
| Hard-coded July dates | Immediately undermines trust in the product | Calculate dates from the current planning period. |
| No automated tests | High-risk changes can regress core flows unnoticed | Add focused unit and end-to-end tests for login, data persistence, planning and shopping generation. |
| Lint command is broken | No automated static quality gate | Add an ESLint flat configuration and run lint in CI. |
| Static shared recipes in frontend | No admin updates, attribution model, pagination or personalised discovery | Create a database-backed shared catalogue with chef and source entities. |
| No server-side integration boundary | AI keys, scraping and privileged admin operations cannot be implemented safely | Add one serverless or edge-function layer. |
| Authentication email rate dependency | Friend testing can be blocked by low default email limits | Configure production SMTP, friendly cooldown handling and documented auth support. |
| No monitoring or error reporting | Failures are invisible until a user reports them | Add privacy-conscious frontend error reporting and backend operation logs. |

### Medium

| Item | Impact | Recommended action |
|---|---|---|
| Monolithic `App.tsx` | Slower and riskier feature changes | Split by feature page and shared UI component as changes are made. |
| No URL routing | Poor browser navigation, refresh and shareability | Add lightweight routes for pages and recipe details. |
| Weak input validation | Malformed and incomplete content enters the database | Add shared schemas and friendly field-level validation. |
| Ingredients stored only as free-form JSONB | Weak search, matching and quantity aggregation | Introduce canonical ingredients and structured quantities incrementally. |
| Missing foreign-key indexes | Queries will degrade as data grows | Add indexes through a migration. |
| No household membership workflow | Product promise and schema cannot support shared household use | Add invitation, membership and role rules. |
| Accessibility gaps in overlays, labels and drag-and-drop | Some users cannot reliably operate key flows | Add dialog semantics, focus management, labels and keyboard alternatives. |
| Shopping checked state is ephemeral | Users lose progress while shopping | Persist a generated list or at least session state. |

### Low

| Item | Impact | Recommended action |
|---|---|---|
| Dependencies use `latest` | Upgrades can be unpredictable | Pin supported version ranges and use planned dependency updates. |
| Unused `useStoredState` hook | Minor maintenance noise | Remove unless there is a current use. |
| Global stylesheet will become harder to maintain | Style changes may have broad side effects | Split styles alongside feature components when those areas are next changed. |
| Emoji recipe art | Limits visual polish and chef/source recognition | Replace progressively with optimised recipe and chef imagery. |
| No bundle splitting | Initial bundle may grow with future features | Add route or feature splitting when bundle growth becomes material. |

## 9. Gap Analysis: Current MVP vs Product Specification

The table below uses the Cooksmith product direction agreed during planning: shared and personal recipes, chef-led discovery, URL import and sharing, household profiles, standard pantry setup, fortnightly planning, shopping export and an intelligence layer. Status describes the implementation on the assessed `main` branch.

| Epic | Status | Current capability | Missing to meet specification |
|---|---|---|---|
| Authentication and onboarding | Partial | Email magic-link login and automatic household creation | Production email delivery, guided onboarding, household profile, preferences, account support and deletion |
| Household collaboration | Foundation only | Schema assigns each user to one household | Invite or join household, multiple members, owner/member roles, member management and concurrent-safe writes |
| Shared recipe catalogue | Prototype only | Twelve recipes compiled into the frontend | Database catalogue, admin publishing, chef and source attribution, images, search, pagination and content status |
| Personal recipes | Partial | Add title, URL and ingredient lines; household-private persistence | Full method, edit, delete, validation, structured ingredients, image and import review |
| Recipe URL import | Not started | Source URL can be stored | Secure fetching, structured extraction, preview, validation, attribution, failure handling and duplicate detection |
| Recipe sharing | Not started | No sharing workflow | Share links or device share action, permissions and safe handling of personal recipes |
| Chef discovery | Not started | No chef entity | Chef profiles and photos, search by chef, related-chef logic and transparent recommendation reasons |
| Recipe search and discovery | Partial | Client-side title/tag search and five fixed filters | Ingredient, chef and preference search, favourites, history, server-side search and personalised suggestions |
| Household preferences | Not started | No preference fields or UI | Household size, dietary preferences, dislikes, typical cooking time and recommendation controls |
| Pantry setup and management | Partial | Add, check and delete free-text pantry items | Standard Australian pantry starter set, bulk selection, categories, edit, structured quantities and clearer stock semantics |
| Weekly and fortnightly meal planning | Partial | Seven weekday dinner slots, add next free night and drag/swapping | Real dates, rolling fortnight, navigation, plan history, free-text meals, leftovers/eating out and copy/repeat actions |
| Shopping list generation | Partial | Derives ingredients and loosely checks pantry | Quantity normalisation, categories, persisted list, manual items, collaboration and reliable pantry exclusions |
| Coles and Woolworths hand-off | Not started | No export action | One-tap copy format, retailer-friendly ingredient names, clear instructions and device share support |
| Administration and bulk recipe import | Not started | Shared recipes require a code change | Protected admin role, CSV or structured import, image/source validation, preview, publish and audit history |
| AI recipe and chef intelligence | Not started | No AI architecture | Server-side model access, prompt/version strategy, structured outputs, evaluations, cost controls and feedback loop |
| Mobile and tablet experience | Mostly implemented | Responsive layouts, touch planner and safe-area navigation | Device testing, accessible modal behaviour, keyboard alternative, reduced motion and refinement from friend feedback |
| Reliability, security and operations | Partial foundation | TypeScript build, Supabase sessions and RLS | Safe writes, testing, linting, CI gates, monitoring, rate limits, privacy operations, backups and incident support |

## 10. Production Readiness

### Ready now

- Small, controlled friend testing.
- Mobile web access through Vercel.
- Private single-user household data under normal use.
- Testing the core value proposition of recipes, planning, pantry and shopping.

### Conditions before expanding friend testing

- Fix collection-replacement writes.
- Replace hard-coded dates and date the meal plan properly.
- Configure reliable authentication email delivery.
- Display persistence failures and provide retry.
- Confirm Supabase production redirect URLs and Vercel environment variables.
- Add basic analytics and error reporting with appropriate privacy notice.
- Complete focused mobile Safari and Android Chrome testing.

### Conditions before public production

- Automated quality gates and tests.
- Production monitoring, backups and recovery procedure.
- Privacy policy, terms, account deletion and data export approach.
- Household membership and concurrency model.
- Rate limiting and abuse controls.
- Accessible navigation and overlays.
- Secure server-side boundary for imports, administration and AI.
- Dependency and migration management.
- Defined content ownership, attribution and moderation process for shared recipes.

## 11. Recommended Delivery Sequence

### Phase 1: Stabilise the current MVP

- Safe granular persistence.
- Date-based fortnight meal plan.
- Visible error and save states.
- Lint configuration, focused tests and CI checks.
- Authentication email setup.

### Phase 2: Complete the friend-test experience

- Household profile and standard pantry onboarding.
- Improved personal recipe entry and editing.
- Persisted shopping list and Coles/Woolworths copy action.
- Lightweight analytics and feedback capture.

### Phase 3: Build the catalogue foundation

- Shared recipe, chef, source and structured ingredient model.
- Protected administration and bulk import.
- Search, attribution and recipe imagery.

### Phase 4: Introduce intelligence carefully

- Server-side AI gateway.
- URL recipe extraction with user confirmation.
- Pantry and preference-aware recommendations.
- Similar chef and recipe discovery.
- Evaluation, monitoring and cost controls.

## 12. Assessment Conclusion

Cooksmith has achieved what an MVP should: it makes the product idea tangible and testable without building the whole kitchen sink. The user experience already has a distinctive voice and a coherent core loop. The next step is not a rewrite. It is a focused stabilisation of persistence, dates, validation and quality controls, followed by the agreed household, catalogue and shopping improvements.

React, Vercel and Supabase remain suitable choices. With a small server-side boundary for privileged operations and AI, plus a more deliberate data model, the current foundation can support the next stages without unnecessary platform churn.
