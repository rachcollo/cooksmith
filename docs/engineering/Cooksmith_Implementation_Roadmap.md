# Cooksmith Implementation Roadmap

**Version:** 1.0  
**Status:** Ready for Codex execution planning  
**Date:** 13 July 2026  
**Authority:** This is the authoritative milestone sequence for the Cooksmith v2 build  
**Inputs:** Product Principles v1.0, Product Specification v1.0, Current State Assessment and Technical Architecture Specification v1.2

## 1. Roadmap objective

Build Cooksmith v2 milestone by milestone so each change can be understood, tested, previewed and accepted independently.

The target is a dependable, mobile-first household meal-planning assistant that can:

- onboard a household;
- understand preferences, time and dietary constraints;
- track pantry, fridge and freezer;
- manage attributed public recipes and private household recipes;
- prepare an editable fortnight meal plan;
- generate an accurate shopping list and practical prep plan;
- use AI quietly and safely where it genuinely removes effort;
- learn from simple household feedback.

## 2. Delivery posture

### Greenfield target with selective reuse

Cooksmith v2 will be designed from the Product Specification and target architecture, not from the limitations of the current prototype.

Work remains in `rachcollo/cooksmith`, but uses a dedicated `v2` integration branch:

```text
main                     Current production MVP
  |
  +-- v2                 Target integration branch and stable preview
        |
        +-- m01-guardrails
        +-- m02-v2-shell
        +-- m03-environments-migrations
        +-- ...
```

While [ADR 009](../architecture/decisions/009-temporary-main-mvp-workflow.md) is active, each milestone branch targets `main` and Vercel creates a preview for review. The dedicated staging integration workflow will be reinstated before public beta.

### Selective reuse rules

Reuse:

- React, TypeScript, Vite and Supabase;
- GitHub and Vercel deployment connections;
- Cooksmith brand voice, colours and responsive design direction;
- proven interaction ideas such as recipe cards, detail sheets and touch planning;
- current seeded recipes as test and migration inputs.

Replace or redesign:

- destructive delete-and-reinsert persistence;
- current database schema where it conflicts with the target model;
- weekday-only plans and hard-coded dates;
- monolithic `App.tsx` and tab-only navigation;
- static shared recipe data in frontend source;
- free-text ingredients as the authoritative shopping model;
- incomplete personal-recipe lifecycle;
- raw provider error handling.

Code is reused only if it meets target types, accessibility, testing and error-state standards. “It already exists” is not an acceptance criterion. A cupboard full of mystery containers is not a system architecture.

## 3. Codex execution contract

Every milestone must follow this contract.

### Before coding

1. Read `AGENTS.md`, Product Principles, Product Specification, Technical Architecture and this milestone.
2. Confirm the milestone dependencies are complete.
3. Inspect the current `v2` branch and relevant migrations.
4. State the Product Principles supported and the user effort removed.
5. Create a milestone branch from the latest `v2`.

### During implementation

- Keep changes inside milestone scope.
- Prefer additive database migrations.
- Preserve mobile-first usability and accessible labels.
- Never commit credentials or service keys.
- Add or update tests with the behaviour.
- Use Australian/UK English and Cooksmith voice for product copy.
- Do not introduce a paid provider or architecture dependency without the cost approval rule.
- Record a short architecture decision when implementation differs from this roadmap.

### Before handover

Codex must run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Run database, integration or end-to-end checks required by the milestone. Fix failures before handover.

The handover must include:

- what changed;
- migrations and manual setup required;
- tests completed;
- preview URL or test instructions;
- known limitations;
- rollback approach;
- confirmation that no credentials were committed.

### Definition of done for every milestone

- Acceptance criteria pass.
- Existing completed milestones still pass regression checks.
- Mobile and desktop layouts remain usable.
- Loading, empty, success and failure states are handled.
- No unapproved scope or recurring cost is introduced.
- Documentation and database types are current.
- The milestone can merge into `v2` without breaking its preview.

## 4. Release map

| Release checkpoint | Milestones | Outcome |
|---|---:|---|
| Foundation Preview | 1 to 5 | Clean v2 shell, quality gates and target database foundation |
| Household Alpha | 6 to 11 | Authentication, household profiles, preferences and useful pantry |
| Recipe Alpha | 12 to 18 | Attributed public catalogue, personal recipes and admin import |
| Planning Alpha | 19 to 22 | Manual fortnight plan, shopping and prep without AI dependency |
| Intelligent Beta | 23 to 26 | AI planning, swaps, feedback and household learning |
| Friend-Test Release | 27 to 28 | Notifications, measurement, hardening and controlled rollout |

No release checkpoint requires every later capability. The product remains testable as intelligence is layered on top of dependable foundations.

## 5. Milestone overview

| # | Milestone | Wave | Depends on | Relative size |
|---:|---|---|---|---|
| 1 | Product and engineering guardrails | Foundation | None | S |
| 2 | v2 application shell and quality baseline | Foundation | 1 | M |
| 3 | Environment and migration discipline | Foundation | 2 | M |
| 4 | Design system, routing and accessible navigation | Foundation | 2 | M |
| 5 | Core database, API types and RLS framework | Foundation | 3 | L |
| 6 | Production-ready authentication | Household | 5 | M |
| 7 | Household membership and roles | Household | 6 | L |
| 8 | Household onboarding and settings | Household | 7 | L |
| 9 | Household invitations and member management | Household | 7 | M |
| 10 | Canonical ingredients, units and aliases | Pantry | 5 | L |
| 11 | Pantry, fridge, freezer and starter staples | Pantry | 8, 10 | L |
| 12 | File storage and image pipeline | Recipes | 5 | M |
| 13 | Chef and attribution engine | Recipes | 12 | M |
| 14 | Public recipe engine and search | Recipes | 10, 13 | L |
| 15 | Seeded recipe migration | Recipes | 14 | S |
| 16 | Personal recipe engine | Recipes | 10, 12, 14 | L |
| 17 | Administration console and content workflow | Admin | 13, 14 | L |
| 18 | Bulk and URL recipe import | Admin | 16, 17 | L |
| 19 | Fortnight meal planner | Planning | 8, 14 | XL |
| 20 | Deterministic planning rules | Planning | 11, 19 | L |
| 21 | Smart shopping engine and retailer export | Shopping | 10, 11, 19 | XL |
| 22 | Meal prep engine | Prep | 14, 19 | L |
| 23 | AI platform foundation | Intelligence | 5, 14 | L |
| 24 | AI-assisted fortnight generation | Intelligence | 20, 23 | XL |
| 25 | Intelligent swaps, locks and explanations | Intelligence | 24 | L |
| 26 | Feedback, household memory and recommendations | Learning | 14, 25 | XL |
| 27 | Notifications, analytics, monitoring and cost controls | Operations | 8, 19, 23 | L |
| 28 | Migration, hardening and friend-test release | Release | 1 to 27 | XL |

Relative sizes compare milestones with one another. They are not delivery promises. Each XL milestone should still be implemented as one coherent outcome, using internal commits where useful.

## 6. Detailed milestones

### Milestone 1: Product and engineering guardrails

**Outcome:** Codex has a clear decision framework before touching the v2 implementation.

**Supports principles:** All ten, particularly calm UX, fewer taps and quiet AI.

**Build:**

- Add or confirm repository guidance for brand voice, accessibility, mobile-first design, tests, builds and credential safety.
- Add Product Principles, architecture decisions and roadmap references to the v2 documentation index.
- Define the architecture-decision-record template.
- Define cost approval and AI safety checklists.
- Define milestone pull-request and handover templates.

**Acceptance criteria:**

- A contributor can identify the authoritative documents and their order.
- Every pull request template asks which Product Principles are supported.
- New providers and recurring costs require explicit review.
- No product behaviour changes.

**Not included:** Application refactoring or new dependencies.

### Milestone 2: v2 application shell and quality baseline

**Outcome:** A clean, deployable v2 starting point exists without disturbing the current MVP.

**Supports principles:** Calm interface and a reliable base for every later feature.

**Build:**

- Create the `v2` integration structure in the existing repository.
- Preserve the current production application on `main`.
- Add an initial v2 entry point and branded placeholder route.
- Add ESLint flat configuration and explicit dependency versions.
- Add scripts for lint, typecheck, unit tests and build.
- Add GitHub Actions quality checks.
- Configure Vercel preview behaviour for milestone branches and `v2`.

**Selective reuse:** React, TypeScript, Vite, design tokens and existing Vercel connection.

**Acceptance criteria:**

- v2 preview deploys independently.
- `main` production remains unchanged.
- lint, typecheck, tests and production build pass.
- No credentials are added.

### Milestone 3: Environment and migration discipline

**Outcome:** Development, staging and production changes are repeatable and isolated.

**Build:**

- Add Supabase CLI project structure.
- Define immutable migration and seed conventions.
- Configure local Supabase development.
- Document one free staging project and one future paid production project.
- Separate Development, Preview and Production variables.
- Add migration validation to CI.
- Add database type generation.

**Acceptance criteria:**

- A fresh local database is created from migrations and synthetic seeds.
- Preview never connects to production data.
- Migration order and rollback/forward-fix expectations are documented.
- Baseline infrastructure cost remains within the friend-test envelope.

### Milestone 4: Design system, routing and accessible navigation

**Outcome:** Every v2 feature has a calm, consistent and accessible application frame.

**Supports principles:** One tap over five, clear next action, calm screens.

**Build:**

- Create feature-scoped design tokens and reusable primitives.
- Add React Router and route-level loading/error boundaries.
- Create mobile bottom navigation and suitable tablet/desktop navigation.
- Add accessible dialog, sheet, button, field, empty-state and feedback components.
- Add reduced-motion and keyboard support foundations.
- Define Cooksmith page-header and primary-action patterns.

**Selective reuse:** Brand, typography, colours, responsive patterns and useful visual concepts.

**Acceptance criteria:**

- Routes support refresh, browser back and direct links.
- Navigation works with keyboard and VoiceOver basics.
- Each placeholder route has one obvious next action.
- Core primitives have component tests.

### Milestone 5: Core database, API types and RLS framework

**Outcome:** The target data foundation exists before domain features are added.

**Build:**

- Create shared timestamp, audit and updated-at functions.
- Create profiles, households, memberships, app roles, settings and dietary requirement tables.
- Create reusable membership and role authorisation functions.
- Enable RLS and default-deny policies.
- Add required indexes and constraints.
- Generate TypeScript database and domain types.
- Add pgTAP tests for tenant isolation.

**Replace:** Current one-profile-to-one-household assumption where it prevents invitations and membership.

**Acceptance criteria:**

- Owner, member, unrelated user and administrator tests behave as designed.
- Private rows cannot be read or changed across households.
- Schema builds from a fresh migration.
- Existing MVP tables are not destructively removed yet.

### Milestone 6: Production-ready authentication

**Outcome:** Users can sign in reliably and recover from common email problems.

**Build:**

- Implement v2 session provider and protected routes.
- Configure Resend SMTP instructions and branded authentication templates.
- Add resend cooldown, rate-limit message, expired-link help and retry.
- Validate local, v2 preview and production redirect URLs.
- Add sign-out and session-expired states.

**Selective reuse:** Supabase Auth and the successful magic-link concept.

**Acceptance criteria:**

- Sign-in, sign-out, refresh and expired-link journeys pass.
- Provider errors are translated into useful Cooksmith language.
- Authentication secrets remain server-side or in approved public environment variables.
- Email remains inside the free-tier plan for expected testing volume.

### Milestone 7: Household membership and roles

**Outcome:** A user can belong to a household with safe owner/member permissions.

**Build:**

- Create household automatically during first onboarding.
- Assign the creator as owner.
- Implement active-household resolution.
- Add owner and member permission services.
- Add global content editor and administrator checks for later milestones.
- Migrate existing users into owner memberships in staging test data.

**Acceptance criteria:**

- A user sees only active household data.
- The last owner cannot be removed accidentally.
- Administrator status is not inferred from frontend data or email address.
- Authorisation has integration and RLS tests.

### Milestone 8: Household onboarding and settings

**Outcome:** Cooksmith understands enough to make useful plans without turning onboarding into an interrogation.

**Supports principles:** Reduce mental load, quiet intelligence and clear next action.

**Build:**

- Create a short progressive onboarding flow.
- Capture household name, default servings, weeknight/weekend time, prep preference, shopping store, budget band, cooking skill and enjoyment.
- Capture dietary requirements, allergies, cuisines, likes and dislikes with clear privacy wording.
- Use useful defaults and allow skipping non-essential fields.
- Create settings view for later correction.

**Acceptance criteria:**

- A new household completes onboarding in under 10 minutes in a realistic walkthrough.
- Allergies are explicit hard constraints, not inferred preferences.
- All settings can be reviewed and corrected.
- Onboarding always shows the next action and progress without clutter.

### Milestone 9: Household invitations and member management

**Outcome:** Another household member can join the same Cooksmith household safely.

**Build:**

- Generate hashed, expiring invitation tokens.
- Send invitation email through Resend.
- Add accept, expire, resend and revoke flows.
- Add member list, role changes and removal for owners.
- Audit membership events.

**Acceptance criteria:**

- A second user joins and sees shared household data.
- Tokens are single-use and expire.
- Removed members lose access immediately.
- No raw invitation token is stored in logs or the database.

### Milestone 10: Canonical ingredients, units and aliases

**Outcome:** Recipes, pantry and shopping use the same dependable ingredient language.

**Build:**

- Create ingredient categories, ingredients and locale-aware aliases.
- Define initial supported units and conversion groups.
- Seed common Australian ingredient names and terms.
- Implement deterministic normalisation and unit conversion services.
- Add unresolved-ingredient review status rather than guessing.

**Acceptance criteria:**

- Common Australian recipe and pantry terms map consistently.
- Compatible units convert correctly under golden tests.
- Allergens are never merged through fuzzy alias matching.
- No AI is needed for common deterministic matches.

### Milestone 11: Pantry, fridge, freezer and starter staples

**Outcome:** A household can confirm what it normally has with minimal typing.

**Supports principles:** Reduce waste, grocery spend, time and taps.

**Build:**

- Create pantry items with location, ingredient, quantity, unit and stock state.
- Add Australian starter staples with quick bulk confirm/remove.
- Add create, edit, consume, low-stock and delete actions.
- Create Pantry, Fridge and Freezer views with useful filters.
- Add explicit rough/unknown quantity options where exact numbers are unnecessary.

**Acceptance criteria:**

- A new household establishes a useful baseline quickly.
- Users can manage items without a stocktake-style experience.
- Low stock is clear but not nagging.
- All changes use granular persistence and visible save/error states.

### Milestone 12: File storage and image pipeline

**Outcome:** Public and private images are secure, credited and inexpensive to deliver.

**Build:**

- Create public catalogue, private draft, household upload and temporary job buckets.
- Add storage policies and signed private access.
- Validate MIME type, size and image dimensions.
- Strip unnecessary metadata.
- Create standard WebP/AVIF delivery variants once during import.
- Store alt text, credit and source metadata.

**Acceptance criteria:**

- Private household images cannot be accessed by unrelated users.
- Public images use content-hashed paths and long cache lifetimes.
- Oversized or invalid uploads fail safely.
- Repeated paid image transformations are not required for normal delivery.

### Milestone 13: Chef and attribution engine

**Outcome:** Cooksmith can celebrate real chefs and preserve proper source credit.

**Build:**

- Create chef records, slugs, biography, website and image metadata.
- Create attribution fields and validation rules.
- Build chef list and detail routes.
- Add source and image-credit presentation components.
- Add duplicate chef detection based on canonical name and website.

**Acceptance criteria:**

- Chef profiles are searchable and mobile friendly.
- Published content cannot omit required attribution.
- Source and credits are visible without overwhelming the recipe.
- Duplicate chef warnings do not silently merge records.

### Milestone 14: Public recipe engine and search

**Outcome:** Shared recipes live in the database and can be found without a frontend deployment.

**Build:**

- Create recipe, ingredient, method, tag and lifecycle tables.
- Add prep, cook, active and passive time as first-class fields.
- Add cuisine, diet and meal-prep suitability.
- Create paginated search and filters for chef, time, ingredient, cuisine and diet.
- Build recipe list, card and detail routes.
- Add next-action controls for favourite and add to plan.

**Acceptance criteria:**

- Public recipes are server searchable and paginated.
- Recipe details display complete attribution and time information.
- A content update does not require rebuilding the frontend.
- Common recipe journeys pass accessibility and mobile tests.

### Milestone 15: Seeded recipe migration

**Outcome:** Existing MVP recipes become valid catalogue records and test fixtures.

**Build:**

- Map the 12 seeded recipes into the target schema.
- Create placeholder attribution review flags where source information is missing.
- Resolve canonical ingredients and units.
- Add migration validation report.
- Remove v2 dependency on `src/data.ts` after successful verification.

**Acceptance criteria:**

- All migrated recipes pass schema validation.
- Incomplete attribution remains draft or review, not falsely published.
- Recipe IDs and references are stable in v2.
- The migration can be rerun idempotently in a fresh environment.

### Milestone 16: Personal recipe engine

**Outcome:** Households can maintain complete private recipes.

**Build:**

- Create, edit, duplicate, archive and restore personal recipes.
- Capture source URL, image, servings, time, structured ingredients and real method steps.
- Add household-private RLS.
- Add save validation and duplicate warnings.
- Support Add to plan from personal recipe detail.

**Acceptance criteria:**

- No placeholder method is inserted as a substitute for real content.
- Personal recipes are invisible outside the household.
- Editing and archiving do not break historical plan references.
- Mobile form entry remains practical.

### Milestone 17: Administration console and content workflow

**Outcome:** Public content can be managed without database editing or code deployment.

**Build:**

- Create protected admin shell.
- Add chef, recipe, ingredient, tag and category management.
- Add Draft, Review, Published and Archived lifecycle.
- Add attribution and duplicate issue queues.
- Audit every administrative mutation.

**Acceptance criteria:**

- Content editors cannot access private household data.
- Only authorised roles can publish or archive public content.
- Every public-content change is attributable and reviewable.
- Admin code is lazy-loaded and absent from normal household navigation.

### Milestone 18: Bulk and URL recipe import

**Outcome:** Recipes can be brought into Cooksmith efficiently without sacrificing attribution or data quality.

**Build:**

- Add CSV/JSON bulk upload with validation report.
- Add queued URL import with SSRF and size protections.
- Prefer structured Recipe metadata before AI extraction.
- Add duplicate checks across source URL, title, chef and ingredients.
- Produce drafts with issue flags and review actions.
- Support household import and administrator bulk modes.

**Acceptance criteria:**

- Imports are idempotent and never auto-publish.
- Failed rows do not prevent valid rows becoming reviewable drafts.
- Source, chef and image-credit gaps are visible.
- Import jobs can be retried safely.

### Milestone 19: Fortnight meal planner

**Outcome:** A household can manually organise a real 14-day period in under 15 minutes.

**Supports principles:** Save time, reduce mental load and make the next action obvious.

**Build:**

- Create date-based meal plans and items.
- Add rolling fortnight, previous/next navigation and current-date focus.
- Add recipe, custom meal, leftovers, takeaway/eating out and away states.
- Add servings, lock, remove and accessible drag/move.
- Support Busy, Normal, Guests, School Holidays and Travel scenarios.
- Add optimistic granular saving and conflict handling.

**Acceptance criteria:**

- Multiple planning periods coexist safely.
- Touch and keyboard reordering work.
- Locked items persist.
- Manual fortnight planning completes in under 15 minutes in a realistic test.
- Hard-coded dates and weekday-only keys are gone from v2.

### Milestone 20: Deterministic planning rules

**Outcome:** Cooksmith can score sensible recipe candidates before any AI call.

**Build:**

- Implement eligibility for allergies, diet, time and recipe status.
- Score pantry coverage, ingredient overlap, budget band, time fit, variety, favourites, leftovers and prep suitability.
- Add scenario-specific time and serving overrides.
- Produce ranked candidates and human-readable scoring factors.
- Create deterministic fallback plan assembly.

**Acceptance criteria:**

- Hard exclusions pass 100% of tests.
- Identical inputs produce identical scores.
- Scoring factors are inspectable and explainable.
- A usable plan can be created when AI is disabled.

### Milestone 21: Smart shopping engine and retailer export

**Outcome:** A confirmed meal plan produces an accurate, practical shopping list.

**Supports principles:** Reduce grocery spend, waste, time and taps.

**Build:**

- Scale ingredients by planned servings.
- Convert compatible units and merge canonical ingredients.
- Subtract confirmed pantry quantities.
- Group by category and preserve recipe references.
- Persist manual items and purchased state.
- Add Coles and Woolworths plain-text formats.
- Add one-tap copy and device share.

**Acceptance criteria:**

- Golden meal plans generate exact expected quantities.
- Pantry subtraction never creates negative quantities.
- Unresolved items remain visible rather than disappearing.
- Export pastes cleanly into retailer search from mobile.
- Generation meets the five-second product target.

### Milestone 22: Meal prep engine

**Outcome:** A household receives a safe, efficient prep session matched to available time.

**Build:**

- Add prep-suitability and task metadata to recipes and steps.
- Group identical ingredient preparation across recipes.
- Build dependencies and calculate task duration.
- Implement None, Quick, Standard and Batch modes.
- Show estimated time and time saved later.
- Persist completion state and affected recipes.

**Acceptance criteria:**

- Fixed recipe sets produce stable ordered tasks.
- Safety-sensitive storage and preparation rules are deterministic.
- Task durations fit the selected mode or clearly explain overflow.
- Users can understand what is already prepared for tonight's meal.

### Milestone 23: AI platform foundation

**Outcome:** AI can be introduced securely, measurably and cheaply without becoming application plumbing.

**Build:**

- Create versioned Edge Function API foundation.
- Add provider-neutral AI interface and OpenAI Responses adapter.
- Add structured output schemas and versioned prompt modules.
- Add AI run metadata, redaction, correlation, timeout, one retry and deterministic fallback.
- Add per-household quotas and an initial A$20 monthly AI budget policy.
- Add fast, balanced and reasoning model tiers, defaulting to the cheapest model that passes evaluations.
- Create fake provider and initial evaluation harness.

**Acceptance criteria:**

- No AI secret reaches the browser.
- Every machine-consumed result passes schema validation.
- Each call records model, prompt version, latency, tokens and estimated cost.
- Quota exhaustion falls back or pauses safely.
- Normal MVP journeys do not use the highest-cost tier.

### Milestone 24: AI-assisted fortnight generation

**Outcome:** Cooksmith prepares a complete editable fortnight from household context.

**Build:**

- Assemble minimal structured context from settings, pantry, scenario and ranked candidates.
- Generate only from known recipe IDs.
- Validate dates, servings, locks, exclusions, variety and recipe existence.
- Repair invalid slots deterministically or retry once.
- Save plan and concise suggestion reasons transactionally.
- Add generating, success, partial-fallback and failure UX.

**Acceptance criteria:**

- Hard constraints pass 100% of evaluation cases.
- A complete valid fortnight is returned in under 30 seconds at the agreed percentile.
- Provider failure produces a useful deterministic plan.
- The user edits the proposal rather than facing a blank planner.
- AI cost per accepted plan is visible.

### Milestone 25: Intelligent swaps, locks and explanations

**Outcome:** Users can adjust one meal without Cooksmith rearranging their whole life.

**Build:**

- Persist and enforce locks.
- Add single-meal regeneration using reason, date and remaining-plan context.
- Add ranked swap suggestions and direct day-to-day swap.
- Preserve unaffected dates and shopping/prep recalculation status.
- Explain suggestions from deterministic scoring factors.

**Acceptance criteria:**

- Locked meals never change during generation.
- Regenerating one meal does not alter other meals.
- Suggestions remain eligible for household constraints.
- Every change is undoable during the session.

### Milestone 26: Feedback, household memory and recommendations

**Outcome:** Cooksmith improves through lightweight feedback without creating hidden or creepy memory.

**Build:**

- Add Loved it, Liked it and Never again.
- Add Too much effort, Too expensive and Too spicy reasons.
- Store structured feedback and update deterministic scoring.
- Derive preferences only after sufficient evidence.
- Store source, confidence, confirmation and expiry for inferred memories.
- Add a plain-English memory view with correct/delete actions.
- Add recipe and chef recommendations with transparent reasons.

**Acceptance criteria:**

- Never again excludes a recipe unless the user changes it.
- Inferred preferences are visible and correctable.
- Hard allergies are never inferred from soft feedback.
- Raw conversation history is not used as hidden household memory.
- Recommendations explain the useful reason, not marketing fluff.

### Milestone 27: Notifications, analytics, monitoring and cost controls

**Outcome:** Cooksmith can prompt useful weekly habits, measure success and remain supportable without nagging or bill shock.

**Build:**

- Add planning, prep, meal and shopping reminder preferences.
- Add in-app notifications and transactional email.
- Prepare optional web push behind explicit opt-in.
- Add first-party safe events for onboarding, plan completion, edit rate, shopping generation and prep use.
- Add Sentry and operational job dashboards.
- Add monthly provider cost, active household and AI cost-per-operation reporting.
- Add cost alerts and free-tier upgrade-gate checklist.

**Acceptance criteria:**

- Reminders respect timezone, quiet hours and preferences.
- Lock-screen content contains no sensitive dietary information.
- Product success metrics can be measured without raw meal or allergy content in analytics.
- Expected friend-test cost remains A$5 to A$20 monthly.
- Moving above A$100 monthly requires explicit review.

### Milestone 28: Migration, hardening and friend-test release

**Outcome:** v2 safely replaces the prototype for controlled household testing.

**Build:**

- Migrate suitable existing users, personal recipes, pantry items and current plans into v2 target tables.
- Produce exception report for data that cannot migrate safely.
- Run full unit, integration, RLS, end-to-end, accessibility and AI evaluation suites.
- Complete mobile Safari and Android Chrome testing.
- Add privacy notice, data export, account deletion and retention jobs.
- Rehearse backup restore, feature disablement and rollback.
- Confirm domain, redirects, email, environment values and spend caps.
- Complete a controlled rollout from `v2` to `main`.

**Acceptance criteria:**

- Current production data has a verified backup.
- Migration is repeatable and reconciles record counts.
- Critical journeys pass on phone and desktop.
- No Critical or unaccepted High defects remain.
- The previous Vercel production deployment can be restored.
- Friend-test support and incident steps are documented.
- Production tier decisions remain inside the approved cost envelope.

## 7. Sequencing and scope rules

### Do not start AI early

Milestone 23 must not begin before recipes, ingredients, pantry and deterministic planning rules are dependable. AI cannot rescue an ambiguous data model. It can only make the ambiguity sound confident, which is not quite the superpower we are after.

### Do not migrate production data early

Current MVP data remains untouched while v2 is built. Migrations are additive. Production migration occurs in Milestone 28 after rehearsal against staging data.

### Do not build every future table immediately

The architecture specifies the target model. Each table is activated in the milestone that needs it. This prevents a large unused schema from becoming an accidental commitment.

### Do not introduce parallel vendors without evidence

At 20 to 50 monthly active users:

- no Redis;
- no external queue vendor;
- no paid product analytics platform;
- no native application infrastructure;
- no Stripe until pricing is validated;
- no model upgrade solely because a newer model exists.

## 8. Milestone governance

### Status values

- Not started
- Ready
- In progress
- In review
- Accepted
- Blocked

Only one milestone should normally be In progress for a single Codex workstream. A milestone becomes Ready only when dependencies are Accepted and required accounts or user choices are available.

### Change control

If a milestone grows materially:

1. preserve the intended user outcome;
2. separate optional work into a later milestone or backlog item;
3. update dependencies and acceptance criteria;
4. record architecture or cost impact;
5. do not quietly expand the branch until it becomes impossible to review.

### Release decision

At each release checkpoint, review:

- Product Principles alignment;
- acceptance criteria;
- mobile usability;
- household data isolation;
- regression results;
- recurring cost;
- user feedback;
- whether the next wave still solves the most important problem.

The roadmap is a delivery guide, not a dare to build all 28 milestones regardless of what households tell us. Friend feedback may change priority. The Product Principles and core outcome remain the anchor.

## 9. Recommended starting instruction for Codex

```text
Implement Cooksmith v2 Milestone 1 from Cooksmith_Implementation_Roadmap.md.

Before coding, read AGENTS.md, Cooksmith_Product_Principles.md,
the Product Specification, Cooksmith_Current_State_Assessment.md and
Cooksmith_Technical_Architecture_Specification.md.

Work only within Milestone 1 scope. Confirm dependencies and the Product
Principles supported. Preserve the current main production application.
Use a milestone branch targeting `main` while ADR 009 is active. Add the required tests and documentation.
Run lint, typecheck, test and build before handover. Do not commit credentials
or introduce a paid provider.
```

Replace `Milestone 1` with the next Ready milestone after the previous milestone is accepted.
