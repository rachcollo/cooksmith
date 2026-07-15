# Cooksmith Technical Architecture Specification

**Deliverable:** 2 - Technical Architecture Specification  
**Version:** 1.2  
**Status:** Proposed for implementation  
**Date:** 13 July 2026  
**Inputs:** Cooksmith Product Specification v1.0 and Current State Assessment  
**Current repository baseline:** `rachcollo/cooksmith`, `main`, commit `0ae700388520914eaa6b5c12710c3f431c85c385`

## Executive decision summary

Cooksmith should use a greenfield target architecture with selective reuse. The work remains in the existing repository and retains the proven hosting and platform choices, but the long-term domain model, persistence layer and application structure must not be constrained by the prototype.

The target architecture is:

- React and TypeScript progressive web application hosted by Vercel.
- Supabase Auth, PostgreSQL, Row-Level Security and Storage as the core platform.
- Supabase Edge Functions as the only trusted server-side boundary for AI, recipe imports, administration, notifications and multi-record transactions.
- OpenAI Responses API behind an internal provider interface, using structured outputs and versioned prompts.
- Resend for Supabase authentication SMTP and transactional email.
- Sentry for application errors, Supabase logs for backend operations and a small first-party event model for product analytics.
- No payment implementation during the MVP. Stripe is the nominated future provider if a paid plan is validated.
- Cost efficiency as an explicit architecture constraint, targeting near-zero infrastructure cost during friend testing and a controlled small-production baseline.

This specification separates deterministic product logic from AI. Dates, quantities, permissions, budgets, dietary exclusions and shopping calculations remain code and database rules. AI proposes, ranks, extracts and explains. It does not become the database, calculator or final authority.

The Cooksmith Product Principles are the governing decision lens. Architecture or implementation choices that do not save time, reduce mental load, reduce waste or make the next action clearer require explicit justification.

## 1. Architecture Overview

### 1.1 System diagram

```text
                        GitHub
                           |
                    branch / pull request
                           v
                    Vercel build system
                           |
             +-------------+-------------+
             |                           |
       Preview deployment          Production web app
             |                           |
             +-------------+-------------+
                           |
                    React PWA client
                           |
              Supabase Auth access token
                           |
          +----------------+----------------+
          |                                 |
          v                                 v
 Supabase Data API                   Edge Function API v1
 Simple RLS-protected CRUD           Trusted orchestration
          |                                 |
          +----------------+----------------+
                           |
                    PostgreSQL + RLS
                           |
       +-------------------+-------------------+
       |                   |                   |
       v                   v                   v
 Supabase Storage     Async job queue      Scheduled jobs
 public/private       imports, AI, email   reminders, cleanup
       |                   |                   |
       +-------------------+-------------------+
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
      OpenAI API        Resend API       Sentry
      AI workloads      email delivery   error reporting
```

### 1.2 Implementation posture: greenfield with selective reuse

The current MVP proved the concept and brand direction, but several foundations do not support the Product Specification. Reworking them in place would preserve constraints that are cheaper to remove now.

**Greenfield** means the target domain model, feature structure, API contracts and data flows are designed from the Product Specification first. It does not mean discarding working infrastructure or rebuilding for sport.

The target application was initially built on a dedicated `v2` integration branch. [ADR 009](../architecture/decisions/009-temporary-main-mvp-workflow.md) temporarily supersedes that delivery workflow: milestone branches now merge into `main` after review and CI while the MVP remains private. Dedicated staging will be reinstated before public beta.

| Reuse selectively | Replace or redesign | Reason |
|---|---|---|
| React, TypeScript and Vite toolchain | Monolithic `App.tsx` structure | The stack is sound; the component boundaries are not suitable for the roadmap |
| Vercel deployment and GitHub connection | Direct milestone work on production `main` | Keep current delivery infrastructure while isolating the v2 build |
| Supabase platform and Auth | Current weekday-only meal-plan schema | Real dates and fortnights are fundamental to the product |
| Brand voice, colours, typography and responsive patterns | Delete-all and reinsert persistence hook | Data-loss and concurrency risks must not carry forward |
| Useful recipe card, detail and touch-planner interaction concepts | Static shared recipes compiled into the frontend | Public content needs attribution, administration and database search |
| dnd-kit where it remains accessible | Tab-only navigation without URLs | Deep linking, browser history and route-level loading are required |
| Existing environment-variable discipline | Free-text ingredient and quantity model as the system of record | Shopping accuracy requires canonical ingredients, units and quantities |
| Current seeded recipes as migration test data | Placeholder personal recipe method and incomplete CRUD | Personal recipes need a complete, dependable lifecycle |

Selective reuse must be earned component by component. Code is reused only when it matches the target types, accessibility requirements, error states, tests and Product Principles. Visual similarity alone is not enough.

### 1.3 Architectural principles

1. **One source of truth:** PostgreSQL is authoritative for household, recipe, plan, pantry, shopping, prep and feedback data.
2. **Household isolation:** Every private record is scoped by `household_id` and protected with Row-Level Security.
3. **Deterministic before generative:** Use code for filtering, arithmetic, unit conversion, dates, permissions and constraint validation.
4. **AI is advisory:** AI returns typed proposals. Users confirm imports and can edit generated plans.
5. **Server-side secrets only:** AI, email, admin and service-role credentials never enter the browser bundle.
6. **Incremental evolution:** Stabilise the current MVP before adding intelligent generation.
7. **Mobile first:** The application remains touch-friendly, accessible and usable as an installable PWA.
8. **Observable operations:** Important writes and AI jobs have status, error and correlation identifiers.
9. **Keep the MVP small:** Future tables and services are activated only when their feature phase begins.
10. **Earn the upgrade:** Begin on free or included tiers and move to paid infrastructure only when reliability, commercial use or measured demand justifies it.

### 1.4 Services

| Service | Responsibility | MVP status |
|---|---|---|
| React web client | UI, local interaction state, accessible navigation and optimistic presentation | Existing, to be modularised |
| Vercel | Static frontend hosting, preview deployments, production CDN and web performance | Existing |
| Supabase Auth | Magic-link authentication, sessions and JWT issuance | Existing |
| Supabase PostgreSQL | Transactional data, constraints, RLS, search and scheduled queries | Existing, schema expansion required |
| Supabase Data API | RLS-protected simple CRUD for low-risk resources | Existing through `supabase-js` |
| Edge Function `api-v1` | Validated business API for multi-step actions, AI and administration | New |
| Edge Function `worker` | Processes queued imports, AI jobs, email and cleanup work | New when background work begins |
| Supabase Storage | Public catalogue images and private household uploads | New |
| OpenAI | Structured extraction, plan proposals, explanations and cooking assistance | New in Phase 2 |
| Resend | Custom SMTP for Auth and transactional notifications | New before wider testing |
| Sentry | Frontend and Edge Function error reporting | New before wider testing |
| Stripe | Future subscriptions and billing | Deferred, no MVP code |

Supabase recommends Edge Functions for server-side TypeScript integrations and secrets, while RLS protects tables exposed through the Data API. This matches the proposed split between simple CRUD and trusted orchestration. [Supabase Edge Functions](https://supabase.com/docs/guides/functions), [Supabase data security](https://supabase.com/docs/guides/database/secure-data)

### 1.5 Data flow

#### Standard authenticated read

1. Supabase Auth restores the browser session.
2. The client sends the JWT through `supabase-js`.
3. RLS resolves the user's active household membership.
4. PostgreSQL returns only authorised rows.
5. The client maps rows into typed view models.

#### Simple write

1. Client validates the form with a shared schema.
2. Client inserts, updates or deletes one row through the Data API.
3. PostgreSQL applies constraints and RLS.
4. Client confirms saved state or displays a recoverable error.
5. The client never deletes and recreates a whole collection.

#### AI-generated fortnight plan

1. Client calls `POST /api/v1/meal-plans/generate` with the planning context.
2. Edge Function validates JWT, membership, quotas and request schema.
3. Deterministic queries select eligible recipes using allergies, diet, time, pantry and budget constraints.
4. The AI orchestrator receives only the minimum structured context and candidate recipe IDs.
5. OpenAI returns a schema-conforming plan proposal.
6. Server validation checks dates, exclusions, duplicates, locked meals, serving counts and recipe existence.
7. Valid plan and AI run metadata are saved transactionally.
8. Client receives the editable plan. Invalid AI output is retried once or falls back to a deterministic plan.

#### Recipe URL import

1. User submits a URL.
2. API creates an import job and returns `202 Accepted`.
3. Worker fetches the page with network and size restrictions.
4. Structured page metadata is extracted first.
5. AI fills a strict recipe schema only where necessary.
6. The result is validated, duplicate-checked and stored as a draft.
7. User or administrator reviews attribution before publication.

### 1.6 Authentication

- Supabase Auth remains the identity provider.
- MVP sign-in uses email magic links through custom Resend SMTP.
- Access tokens are short-lived JWTs; refresh tokens are managed by Supabase.
- Every private request requires `Authorization: Bearer <access_token>`.
- Edge Functions verify the JWT and derive `user_id`; clients never supply a trusted user ID.
- Active household is derived from membership, not accepted blindly from request data.
- Administrator access uses an application role stored in PostgreSQL, not an email allow-list in frontend code.
- OAuth providers may be added later without changing the internal user model.

### 1.7 Deployment and hosting

- GitHub is the source of truth.
- Vercel builds the React application from GitHub.
- Pull requests and non-production branches receive preview deployments; `main` deploys production. Vercel documents automatic GitHub preview and production deployments. [Vercel GitHub deployments](https://vercel.com/docs/git/vercel-for-github)
- Supabase hosts Auth, PostgreSQL, Storage, Edge Functions and scheduled jobs.
- Australia-region infrastructure should be selected where each provider offers it. Cross-border processing must be documented where it remains unavoidable.
- Frontend and backend environments are isolated as Development, Preview/Staging and Production.

## 2. Technology Stack

| Capability | Selected technology | Decision |
|---|---|---|
| Frontend | React, TypeScript, Vite | Retain current stack |
| UI styling | Feature-scoped CSS with existing design tokens | Evolve current CSS, no component framework required |
| Routing | React Router | Add URL navigation, deep links and browser history |
| Forms and validation | React Hook Form plus Zod | Typed, accessible validation without heavy state machinery |
| Client data | `supabase-js` plus TanStack Query | Server-state caching, mutation status and invalidation |
| Drag and drop | dnd-kit | Retain, add keyboard support |
| PWA | Vite PWA plugin and service worker | Installability and future push support |
| Backend | Supabase Edge Functions in TypeScript/Deno | One trusted server-side execution environment |
| API routing | Lightweight router inside `api-v1` | One versioned function, feature modules internally |
| Database | Supabase PostgreSQL | Retain |
| Database access | RLS Data API for simple CRUD; SQL/RPC for transactions | Avoid unnecessary custom endpoints while protecting complex actions |
| Authentication | Supabase Auth | Retain |
| File storage | Supabase Storage | Public and private buckets with policies |
| AI provider | OpenAI Responses API | Access only through Edge Functions |
| AI output | JSON Schema Structured Outputs | Validate every machine-consumed response. OpenAI documents schema-conforming structured outputs. [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) |
| AI abstraction | Internal `AiProvider` interface | Avoid provider-specific logic in product services |
| Search | PostgreSQL full-text and trigram first; pgvector later | Do not add vector search until semantic discovery is validated |
| Queue | Supabase Queue/PostgreSQL job table plus scheduled worker | Async imports, bulk work and notifications |
| Email | Resend SMTP for Auth; Resend API for transactional email | A verified domain is required. [Resend with Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp) |
| Monitoring | Sentry, Supabase logs and structured application logs | Errors, traces and job correlation |
| Analytics | First-party `analytics_events` plus Vercel Web Analytics | Product metrics without placing sensitive meal data into third-party analytics |
| Payments | Stripe | Future only, behind a billing service interface |
| Testing | Vitest, React Testing Library, Playwright, pgTAP and prompt evaluation datasets | Layered quality strategy |

### Payments decision

Payments are outside the current MVP definition. Do not add Stripe tables, webhooks or UI until pricing and entitlements are defined. Reserve an `entitlements` service interface so billing can be added without scattering plan checks throughout the frontend.

### 2.1 Cost architecture and operating rules

Cost control is a product constraint, not a clean-up job for later. The initial target is **20 to 50 monthly active users**, with infrastructure chosen to remain simple and inexpensive at that scale.

#### Target monthly operating envelope

All provider prices are normally billed in US dollars. Australian dollar figures will vary with exchange rates and may exclude GST.

| Stage | Target monthly cost | Expected configuration |
|---|---:|---|
| Development and controlled friend testing | A$5 to A$20 | Supabase Free, Vercel Hobby for non-commercial testing, Resend Free, Sentry Developer, usage-based AI |
| Small commercial production | A$70 to A$90 | Supabase Pro, Vercel Pro, free email and monitoring tiers, controlled AI usage |
| Cost review trigger | A$100 or more | Review actual usage before accepting new vendors, paid add-ons or larger compute |

These are planning estimates, not contractual prices. Current provider pricing must be checked before each upgrade.

#### Explicit cost rules

1. **Free tiers first:** Use Supabase Free, Resend Free and Sentry Developer for controlled testing while their terms and reliability are appropriate.
2. **Commercial hosting gate:** Vercel Hobby is for personal, non-commercial use. Move to Vercel Pro before a commercial Cooksmith launch, not simply because the user count reaches 50. [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
3. **Reliability gate for Supabase:** Move production to Supabase Pro when dependable backups, support and avoidance of free-project pausing become necessary. The upgrade is for production reliability, not capacity. Supabase Free already provides capacity far beyond 50 users. [Supabase pricing](https://supabase.com/pricing)
4. **One paid database only:** At small scale, pay for Production only. Use local Supabase for development and a free project for staging or previews. Never connect previews to Production.
5. **No paid cache:** Use Vercel CDN, browser query caching and PostgreSQL. Do not add Redis or another cache provider until measured load proves it necessary.
6. **No separate queue vendor:** Use Supabase/PostgreSQL jobs and scheduled workers. Reassess only if job volume, duration or reliability exceeds the platform's practical limits.
7. **No paid analytics platform initially:** Use first-party safe events, Vercel's included analytics and Sentry's free allowance. Add a specialist product analytics vendor only when a defined question cannot be answered economically.
8. **No payment infrastructure before pricing validation:** Stripe and entitlement code remain deferred until Cooksmith has a tested commercial offer.
9. **No native app infrastructure:** Continue as a PWA. Apple and Google developer programmes, native build services and mobile push providers are added only if PWA limitations materially affect users.
10. **Optimise images once:** Resize and encode catalogue images during import. Avoid repeated paid image transformations for the same source image.
11. **Short retention by default:** Expire temporary uploads, job artefacts, verbose logs and unnecessary AI payloads. This reduces storage, monitoring and privacy costs together.
12. **Monthly review, not constant tinkering:** Record provider cost, active users and cost per active household monthly. Do not prematurely optimise a service costing a few dollars.

#### Upgrade gates

| Service | Stay on current tier while | Upgrade when |
|---|---|---|
| Supabase | Controlled testing tolerates free-tier pausing and limits | Cooksmith becomes relied upon, real customer data needs production backup expectations, or commercial launch begins |
| Vercel | Testing remains personal and non-commercial | Commercial launch or Pro-only collaboration and controls are required |
| Resend | Under 3,000 emails per month and 100 per day | Delivery volume, daily limit or retention/support requirements exceed Free. [Resend pricing](https://resend.com/pricing) |
| Sentry | One operator and under the included event allowances | Multiple operators or required integrations justify Team. [Sentry pricing](https://sentry.io/pricing/) |
| OpenAI | Monthly AI budget remains within the agreed cap | Increase only after reviewing value, edit rate and cost per accepted plan |
| Supabase compute | Performance targets pass on included compute | Database evidence shows sustained CPU, memory or connection pressure |

#### AI cost policy

- Set an initial OpenAI account budget alert and internal Cooksmith AI budget of **A$20 per month**.
- Apply per-household quotas to plan generation, swaps, imports and cooking questions.
- Use the lowest-cost model that passes the operation's evaluation threshold.
- Default well-defined extraction, formatting and explanation work to the `fast` tier.
- Use the `balanced` tier for fortnight planning only when evaluations show a material quality improvement.
- Do not use the most expensive reasoning tier in normal MVP journeys.
- Keep prompts compact and place reusable stable instructions first so eligible requests benefit from prompt caching.
- Cache a result only when household inputs, recipe candidates, prompt version and model configuration match exactly.
- Log tokens and estimated cost per operation, but do not retain full sensitive prompts solely for billing analysis.
- Stop or fall back to deterministic behaviour when the household or account quota is reached.

OpenAI charges by model token usage rather than a separate Responses API subscription. At small volume, model selection and prompt size matter more than user count. [OpenAI API pricing](https://developers.openai.com/api/docs/pricing)

#### Cost approval rule

Adding any new paid provider, moving a service to a higher paid tier or increasing expected baseline cost by more than **A$20 per month** requires:

1. the problem being solved;
2. current measured usage or limitation;
3. monthly and annual cost estimate;
4. cheaper alternatives considered;
5. a cancellation or rollback path.

This prevents useful architecture from slowly acquiring a small parade of monthly subscriptions.

## 3. Database Design

### 3.1 Database conventions

- PostgreSQL `uuid` primary keys generated server-side.
- `created_at` and `updated_at` as `timestamptz` on mutable entities.
- `created_by` and `updated_by` where provenance matters.
- Private tables include `household_id` and RLS.
- Published catalogue content uses lifecycle status rather than hard deletion.
- User-owned data supports deletion according to retention rules.
- Enums use PostgreSQL enum or constrained text only when values are stable.
- Flexible AI metadata uses JSONB, but core searchable and constrained fields remain relational.
- All migrations are immutable, numbered SQL files committed to GitHub.

### 3.2 Relationship overview

```text
auth.users 1---1 profiles
auth.users *---* households through household_members
households 1---1 household_settings
households 1---* pantry_items
households 1---* meal_plans 1---* meal_plan_items
households 1---* shopping_lists 1---* shopping_list_items
households 1---* prep_plans 1---* prep_tasks

chefs 1---* recipes
recipes *---* tags through recipe_tags
recipes 1---* recipe_ingredients *---1 ingredients
recipes 1---* recipe_steps
recipes 1---* meal_plan_items

meal_plan_items 1---* meal_feedback
households 1---* household_memories
AI operations 1---* ai_runs
```

### 3.3 Table catalogue

Phase labels are **P1 Foundation**, **P2 Planning and AI**, **P3 Prep and learning**, and **Future**.

#### Identity and household

| Table | Phase | Key columns and purpose | Constraints and indexes |
|---|---|---|---|
| `profiles` | P1 | `id` FK to `auth.users`, `display_name`, `timezone`, `locale`, timestamps | PK `id`; timezone required; one profile per user |
| `households` | P1 | `id`, `name`, `status`, timestamps | Name length 1 to 100; index `status`; no physical delete while active members exist |
| `household_members` | P1 | `household_id`, `user_id`, `role`, `status`, `joined_at` | Composite unique `(household_id,user_id)`; indexes on `user_id,status` and `household_id,status`; roles `owner`, `member` |
| `household_invitations` | P1 | `household_id`, `email_hash`, `token_hash`, `role`, `expires_at`, `accepted_at`, `invited_by` | Unique active token hash; expiry check; indexes on household and expiry; store hashes, not raw tokens |
| `app_user_roles` | P1 | `user_id`, `role`, `granted_by`, timestamps | Unique `(user_id,role)`; roles `admin`, `content_editor`, `support`; no client writes |
| `household_settings` | P1 | `household_id`, `default_servings`, weeknight/weekend maximum minutes, `preferred_prep_day`, `prep_mode`, `default_store`, `budget_band`, `cooking_skill`, `cooking_enjoyment` | PK/FK household; numeric ranges and controlled values |
| `household_dietary_requirements` | P1 | `id`, `household_id`, `requirement_type`, `value`, `severity`, `notes`, `applies_to_member_id` nullable | Unique normalised requirement per scope; severity required for allergies; private and excluded from analytics |

#### Pantry and ingredient model

| Table | Phase | Key columns and purpose | Constraints and indexes |
|---|---|---|---|
| `ingredient_categories` | P1 | `id`, `name`, `sort_order` | Unique case-insensitive name |
| `ingredients` | P1 | Canonical `name`, `category_id`, `default_unit`, `aisle_hint`, `is_active` | Unique normalised name; trigram/full-text index on name; index category |
| `ingredient_aliases` | P1 | `ingredient_id`, `alias`, `locale`, `source` | Unique normalised alias per locale; trigram index |
| `pantry_staple_templates` | P1 | `ingredient_id`, `locale`, `default_quantity`, `unit`, `location`, `enabled` | Unique ingredient/locale/location; initially `en-AU` |
| `pantry_items` | P1 | `id`, `household_id`, `ingredient_id` nullable, `display_name`, decimal `quantity`, `unit`, `location`, `stock_status`, `is_default_staple`, `low_stock_threshold`, timestamps | Location `pantry`, `fridge`, `freezer`; quantity non-negative; index household/location/status; partial index for low stock |

#### Recipe catalogue

| Table | Phase | Key columns and purpose | Constraints and indexes |
|---|---|---|---|
| `chefs` | P1 | `id`, `name`, `slug`, `biography`, `website_url`, `image_path`, `image_credit`, `status` | Unique slug; unique canonical website where present; search index name |
| `recipes` | P1 | `id`, `household_id` nullable, `chef_id` nullable, `visibility`, `status`, `title`, `slug`, `description`, prep/cook/active/passive minutes, servings, cuisine, diet summary, source URL, image path/credit, provenance, timestamps | Public requires null household and attribution; private requires household; time values non-negative; servings positive; unique public slug; indexes visibility/status, household/status, chef/status, cuisine |
| `recipe_ingredients` | P1 | `recipe_id`, `ingredient_id` nullable, `display_name`, decimal `quantity` nullable, `unit`, `preparation`, `optional`, `sort_order`, `group_name` | Unique `(recipe_id,sort_order)`; quantity non-negative; indexes recipe and ingredient |
| `recipe_steps` | P1 | `recipe_id`, `step_number`, `instruction`, `active_minutes`, `passive_minutes`, `prep_task_type` nullable | Unique `(recipe_id,step_number)`; non-negative times |
| `tags` | P1 | `id`, `name`, `slug`, `type`, `status` | Unique slug; type includes feature, diet, cuisine, technique and occasion |
| `recipe_tags` | P1 | `recipe_id`, `tag_id` | Composite PK; reverse index on tag |
| `recipe_favourites` | P2 | `household_id`, `recipe_id`, `created_by`, timestamp | Unique `(household_id,recipe_id)`; indexes household and recipe |
| `recipe_import_jobs` | P1 | `id`, `household_id` nullable, `requested_by`, `mode`, source URL/file path, `status`, result recipe ID, error code, attribution JSON, timestamps | Idempotency key unique per requester; indexes status/created, household; URL scheme allow-list |

#### Planning, shopping and prep

| Table | Phase | Key columns and purpose | Constraints and indexes |
|---|---|---|---|
| `meal_plans` | P2 | `id`, `household_id`, `start_date`, `end_date`, `status`, `scenario`, `generated_by`, `generation_run_id`, timestamps | `end_date >= start_date`; maximum 31 days; unique active period per household where appropriate; index household/dates |
| `meal_plan_items` | P2 | `id`, `meal_plan_id`, `household_id`, `planned_date`, `meal_slot`, `recipe_id` nullable, `custom_title` nullable, `servings`, `locked`, `leftover_source_item_id` nullable, `position`, timestamps | Exactly one of recipe/custom title; unique plan/date/slot/position; servings positive; indexes household/date and recipe |
| `meal_feedback` | P3 | `id`, `household_id`, `meal_plan_item_id`, `user_id`, `rating`, reason codes, effort/cost/spice signals, notes, timestamp | One response per user/item; controlled rating `loved`, `liked`, `never_again`; private indexes household/recipe through item |
| `shopping_lists` | P2 | `id`, `household_id`, `meal_plan_id`, `status`, `generated_at`, `version`, timestamps | One current generated version per plan; index household/status |
| `shopping_list_items` | P2 | `id`, `shopping_list_id`, `ingredient_id` nullable, display name, decimal quantity nullable, unit, category, purchased, pantry exclusion state, manual flag, source recipe IDs JSONB, sort order | Unique list/normalised item/unit when mergeable; quantity non-negative; indexes list/purchased/category |
| `prep_plans` | P3 | `id`, `household_id`, `meal_plan_id`, `mode`, estimated minutes, estimated minutes saved, status, generated_by, timestamps | One active plan per meal plan/mode version; non-negative durations |
| `prep_tasks` | P3 | `id`, `prep_plan_id`, instruction, task type, ingredient ID nullable, quantity/unit, recipe IDs, dependency IDs, estimated minutes, sort order, completion state | Unique plan/sort order; non-negative duration; dependencies cannot self-reference |

#### AI, recommendations and operations

| Table | Phase | Key columns and purpose | Constraints and indexes |
|---|---|---|---|
| `household_memories` | P3 | `id`, `household_id`, `memory_type`, structured `value`, `source`, `confidence`, `confirmed`, `expires_at`, timestamps | Unique active memory key; confidence 0 to 1; RLS; no raw conversation transcripts |
| `recommendation_events` | P3 | `id`, `household_id`, `user_id`, `recipe_id`, `event_type`, `context`, timestamp | Index household/time, recipe/event; retention and de-identification policy |
| `ai_runs` | P2 | `id`, `household_id`, `user_id`, operation, prompt version, provider, model, status, latency, token/cost metadata, input/output hashes, redacted error, timestamps | Index household/time, operation/status; raw prompts off by default; correlation ID unique |
| `async_jobs` | P1 | `id`, job type, owner scope, payload reference, status, attempts, available/locked times, error code, idempotency key | Unique idempotency key; indexes claim order and status; payload excludes secrets |
| `audit_logs` | P1 | `id`, actor user/service, household nullable, action, entity type/id, before/after summary, IP hash, user agent summary, timestamp | Append-only; indexes entity/time, actor/time, household/time; no general client select |
| `notification_preferences` | P3 | `user_id`, channel settings, reminder times, timezone, quiet hours | PK user; valid local times and channel enums |
| `push_subscriptions` | Future | `id`, `user_id`, endpoint hash/encrypted endpoint, key material encrypted, device label, last_used, revoked_at | Unique endpoint hash; index user/active |
| `notifications` | P3 | `id`, user/household, type, channel, scheduled/send times, status, dedupe key, payload reference | Unique dedupe key; indexes due status and recipient/time |
| `analytics_events` | P1 | `id`, anonymous/session/user/household pseudonymous IDs, event name, safe properties, timestamp | Partition or retention policy later; index event/time; prohibit allergy, recipe note and raw email fields |

### 3.4 RLS model

- A helper function resolves whether `auth.uid()` is an active household member.
- Owners can manage settings, invitations and members.
- Members can read household settings and manage meal, pantry and personal recipe data.
- Public published recipes and active chefs are readable by authenticated users, with optional anonymous read later.
- Household recipes require active membership in the owning household.
- Content editors can manage draft public content through server-side admin endpoints only.
- Service-role access is limited to Edge Functions and never used by the browser.
- Audit, AI cost and operational job tables are not directly writable by clients.

### 3.5 Future-proofing rules

- Store dates, units and quantities structurally, not only as display strings.
- Keep ingredient aliases locale-aware so Australian retailer terms can differ from overseas recipes.
- Use visibility and status fields to support public, household and archived recipes in one model.
- Keep AI provider/model fields informational, not embedded in business logic.
- Add embeddings only after semantic search or similarity measurably outperforms metadata filtering.
- Partition high-volume audit, analytics and recommendation tables only when volume requires it.
- Avoid event sourcing for core CRUD. Audit important changes separately.

## 4. API Specification

### 4.1 API style

- Base path: `/functions/v1/api-v1`
- JSON request and response bodies.
- Bearer JWT required unless explicitly public.
- ISO 8601 timestamps and `YYYY-MM-DD` local planning dates.
- Cursor pagination for collections.
- `Idempotency-Key` required for generation, import, export and invitation POSTs.
- `X-Correlation-ID` accepted and returned.
- Zod schemas shared between Edge Functions and generated TypeScript API types.

Simple single-row CRUD may use the Supabase Data API during migration. The endpoint catalogue below is the stable application contract. The frontend should call typed service methods so transport can move from Data API to `api-v1` without changing components.

### 4.2 Standard envelopes

Successful item response:

```json
{
  "data": { "id": "uuid", "name": "Example" },
  "meta": { "correlationId": "uuid" }
}
```

Successful collection response:

```json
{
  "data": [],
  "meta": { "nextCursor": null, "correlationId": "uuid" }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "A couple of details need another look.",
    "fieldErrors": { "servings": "Must be at least 1" },
    "retryable": false,
    "correlationId": "uuid"
  }
}
```

### 4.3 Endpoint catalogue

`Auth` is `user` unless otherwise stated. `owner` and `admin` add role requirements.

#### Household and onboarding

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `GET /households/current` | user | No body | `200 {data:{household,membership,settings,requirements}}` |
| `PATCH /households/current` | owner | `{name:"The Collins crew"}` | `200 {data:{household}}` |
| `PATCH /households/current/settings` | owner | `{defaultServings:4,weeknightMaxMinutes:30,defaultStore:"coles"}` | `200 {data:{settings}}` |
| `PUT /households/current/dietary-requirements` | owner | `{requirements:[{type:"allergy",value:"peanut",severity:"strict"}]}` | `200 {data:{requirements}}` |
| `GET /households/current/members` | member | Query `?cursor=` | `200 {data:[{userId,displayName,role}],meta}` |
| `POST /households/current/invitations` | owner | `{email:"person@example.com",role:"member"}` | `201 {data:{invitationId,expiresAt}}` |
| `POST /invitations/{token}/accept` | user | `{}` | `200 {data:{householdId,membership}}` |
| `DELETE /households/current/members/{userId}` | owner | No body | `204` |

#### Pantry

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `GET /pantry-items` | member | `?location=fridge&stockStatus=low&cursor=` | `200 {data:[pantryItem],meta}` |
| `POST /pantry-items` | member | `{ingredientId:"uuid",displayName:"Milk",quantity:1,unit:"L",location:"fridge"}` | `201 {data:{pantryItem}}` |
| `PATCH /pantry-items/{id}` | member | `{quantity:0.5,stockStatus:"low"}` | `200 {data:{pantryItem}}` |
| `DELETE /pantry-items/{id}` | member | No body | `204` |
| `POST /pantry-items/bootstrap` | owner | `{locale:"en-AU",selectedIngredientIds:["uuid"]}` | `200 {data:{created:24,skipped:2}}` |

#### Recipes and chefs

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `GET /recipes` | user | `?q=chicken&chefId=uuid&maxActiveMinutes=20&cursor=` | `200 {data:[recipeSummary],meta}` |
| `GET /recipes/{id}` | user | No body | `200 {data:{recipe,ingredients,steps,chef,tags}}` |
| `POST /recipes` | member | `{title:"Nan's lasagne",servings:6,ingredients:[],steps:[]}` | `201 {data:{recipe}}` |
| `PATCH /recipes/{id}` | member/owner | `{title:"Nan's very good lasagne",prepMinutes:20}` | `200 {data:{recipe}}` |
| `DELETE /recipes/{id}` | member/owner | No body | `204` for household recipe; public content cannot use this route |
| `POST /recipes/{id}/duplicate` | member | `{title:"Our weeknight version"}` | `201 {data:{recipe}}` |
| `POST /recipe-imports` | member | `{sourceUrl:"https://example.com/recipe"}` | `202 {data:{jobId,status:"queued"}}` |
| `GET /recipe-imports/{jobId}` | requesting member/admin | No body | `200 {data:{status,draftRecipeId,issues}}` |
| `GET /chefs` | user | `?q=smith&cursor=` | `200 {data:[chefSummary],meta}` |
| `GET /chefs/{id}` | user | No body | `200 {data:{chef,recipes}}` |
| `PUT /recipes/{id}/favourite` | member | `{favourite:true}` | `200 {data:{favourite:true}}` |

#### Meal plans

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `GET /meal-plans` | member | `?from=2026-07-13&to=2026-07-26` | `200 {data:[mealPlanSummary]}` |
| `POST /meal-plans` | member | `{startDate:"2026-07-13",endDate:"2026-07-26",scenario:"busy"}` | `201 {data:{mealPlan}}` |
| `GET /meal-plans/{id}` | member | No body | `200 {data:{mealPlan,items}}` |
| `PATCH /meal-plans/{id}` | member | `{status:"confirmed",scenario:"normal"}` | `200 {data:{mealPlan}}` |
| `POST /meal-plans/generate` | member | `{startDate:"2026-07-13",days:14,scenario:"busy",prepMode:"quick",lockedItems:[]}` | `202 {data:{jobId,mealPlanId,status:"generating"}}` |
| `PUT /meal-plans/{id}/items/{date}` | member | `{mealSlot:"dinner",recipeId:"uuid",servings:4,locked:false}` | `200 {data:{mealPlanItem}}` |
| `DELETE /meal-plans/{id}/items/{itemId}` | member | No body | `204` |
| `POST /meal-plans/{id}/items/{itemId}/regenerate` | member | `{reason:"too_much_effort"}` | `200 {data:{replacement,explanation}}` |
| `POST /meal-plans/{id}/items/{itemId}/swap` | member | `{targetItemId:"uuid"}` | `200 {data:{items:[updatedItemA,updatedItemB]}}` |

#### Shopping and prep

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `POST /meal-plans/{id}/shopping-list` | member | `{excludePantry:true}` | `201 {data:{shoppingList}}` |
| `GET /shopping-lists/{id}` | member | No body | `200 {data:{shoppingList,items}}` |
| `PATCH /shopping-lists/{id}/items/{itemId}` | member | `{purchased:true}` | `200 {data:{item}}` |
| `POST /shopping-lists/{id}/items` | member | `{displayName:"Dishwasher tablets",quantity:1,unit:"pack"}` | `201 {data:{item}}` |
| `DELETE /shopping-lists/{id}/items/{itemId}` | member | No body | `204` |
| `POST /shopping-lists/{id}/export` | member | `{retailer:"coles",format:"plain_text"}` | `200 {data:{text:"Chicken breast 1 kg\nBrown onions x4",itemCount:2}}` |
| `POST /meal-plans/{id}/prep-plan` | member | `{mode:"quick"}` | `201 or 202 {data:{prepPlanId,status}}` |
| `GET /prep-plans/{id}` | member | No body | `200 {data:{prepPlan,tasks}}` |
| `PATCH /prep-plans/{id}/tasks/{taskId}` | member | `{completed:true}` | `200 {data:{task}}` |

#### Feedback, cooking help and notifications

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `POST /meal-plan-items/{id}/feedback` | member | `{rating:"liked",reasons:["too_spicy"]}` | `201 {data:{feedback}}` |
| `GET /recommendations` | member | `?limit=10&context=fortnight_plan` | `200 {data:[{recipe,reason}]}` |
| `POST /cooking-assistant` | member | `{recipeId:"uuid",question:"Can I prep the sauce now?"}` | `200 {data:{answer,safetyNote:null,sources:[]}}` |
| `GET /notification-preferences` | user | No body | `200 {data:{preferences}}` |
| `PATCH /notification-preferences` | user | `{mealReminder:true,mealReminderTime:"16:30"}` | `200 {data:{preferences}}` |
| `POST /push-subscriptions` | user | `{endpoint:"...",keys:{...}}` | `201 {data:{subscriptionId}}` |
| `DELETE /push-subscriptions/{id}` | user | No body | `204` |

#### Administration

| Method and path | Auth | Request example | Success response |
|---|---|---|---|
| `POST /admin/recipe-imports/bulk` | content editor | Multipart CSV/JSON file | `202 {data:{jobId,received:120}}` |
| `GET /admin/recipe-imports/{jobId}` | content editor | No body | `200 {data:{status,processed,failed,issues}}` |
| `POST /admin/recipes/{id}/publish` | content editor | `{confirmAttribution:true}` | `200 {data:{recipe,status:"published"}}` |
| `PATCH /admin/recipes/{id}/moderation` | content editor | `{status:"review",notes:"Check image credit"}` | `200 {data:{recipe}}` |
| `POST /admin/chefs` | content editor | `{name:"Example Chef",websiteUrl:"https://..."}` | `201 {data:{chef}}` |
| `PATCH /admin/chefs/{id}` | content editor | `{biography:"...",status:"active"}` | `200 {data:{chef}}` |
| `GET /admin/audit-logs` | admin | `?entityType=recipe&cursor=` | `200 {data:[auditEvent],meta}` |

### 4.4 Detailed generation example

Request:

```http
POST /functions/v1/api-v1/meal-plans/generate
Authorization: Bearer <jwt>
Idempotency-Key: 55c231f0-2a43-4f74-9c8f-e6f0d7aa6a34
Content-Type: application/json

{
  "startDate": "2026-07-13",
  "days": 14,
  "scenario": "busy",
  "prepMode": "quick",
  "overrides": {
    "guests": [{"date": "2026-07-18", "extraServings": 2}],
    "awayDates": ["2026-07-21"]
  }
}
```

Response:

```json
{
  "data": {
    "jobId": "9b56f36c-5f93-4eed-b29f-421019e16f82",
    "mealPlanId": "1467f2a6-7fdb-4ab8-a211-1e802257d071",
    "status": "generating",
    "estimatedSeconds": 20
  },
  "meta": { "correlationId": "d996d8b5-0ab0-40d3-b43d-09b41be08a2e" }
}
```

### 4.5 Error handling

| HTTP status | Use |
|---|---|
| `400` | Invalid JSON or malformed parameters |
| `401` | Missing, expired or invalid session |
| `403` | Authenticated but not authorised for household or role |
| `404` | Resource absent or intentionally hidden by access rules |
| `409` | Version conflict, duplicate, overlapping active plan or reused invitation |
| `422` | Well-formed request that violates product rules |
| `429` | Rate or quota limit, includes `Retry-After` |
| `500` | Unexpected server failure with safe message and correlation ID |
| `502` | Upstream AI, email or importer provider failure |
| `503` | Temporary service or queue unavailability |

Provider errors are never returned verbatim. Retryable operations use bounded exponential backoff. Mutations with an idempotency key return the original result when safely repeated.

### 4.6 Versioning

- Version path is `api-v1`.
- Additive response fields do not require a new version.
- Breaking request or response changes require `api-v2` and a documented migration window.
- Database schema versions are independent from API versions.
- Prompts and AI output schemas have their own explicit versions.
- The frontend sends `X-Cooksmith-Client-Version` for support and phased rollout diagnostics.

## 5. AI Architecture

### 5.1 AI role in Cooksmith

AI is a quiet planning engine, not the product's primary interface. The user supplies constraints and edits outcomes. Cooksmith assembles a sensible starting point.

AI operations:

- `extract_recipe`
- `generate_meal_plan`
- `suggest_swap`
- `generate_prep_plan`
- `normalise_ingredient_candidate`
- `explain_recommendation`
- `answer_cooking_question`

Each operation has its own typed input, output schema, prompt version, evaluation set and fallback.

### 5.2 Provider abstraction

```ts
interface AiProvider {
  generateStructured<TInput, TOutput>(request: {
    operation: AiOperation
    input: TInput
    schema: JsonSchema
    modelTier: 'fast' | 'balanced' | 'reasoning'
    promptVersion: string
    timeoutMs: number
  }): Promise<AiResult<TOutput>>
}
```

The initial adapter uses the OpenAI Responses API. Model identifiers are configuration, pinned per environment and changed only after evaluations. The application does not rely on long-lived provider conversation state. OpenAI recommends the Responses API for new direct model workflows and supports structured outputs and typed tool calls. [Responses API guidance](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Function calling](https://developers.openai.com/api/docs/guides/function-calling)

### 5.3 Prompt orchestration

Prompt layers:

1. **System policy:** role, safety, non-negotiable household exclusions, no fabricated attribution and output schema.
2. **Cooksmith policy:** product principles, Australian terminology, practical meal-planning rules and brand voice for explanations.
3. **Operation instructions:** one task such as assembling a fortnight plan or extracting a recipe.
4. **Trusted context:** structured household settings, confirmed memories, pantry summary and candidate recipe records.
5. **User context:** scenario, guests, travel, locked meals and explicit overrides.
6. **Untrusted content:** fetched recipe page or user-pasted text clearly delimited as data.

Prompts live in version-controlled modules and are reviewed like code. Stable instructions precede variable context to improve caching opportunities. OpenAI recommends treating prompts as application code and running evaluation cases when publishing prompt changes. [Prompting guidance](https://developers.openai.com/api/docs/guides/prompting)

### 5.4 Household memory

Memory is structured, inspectable and editable. It is not a hidden transcript.

Sources:

- explicit household settings;
- confirmed dietary requirements and allergies;
- meal feedback;
- observed actions such as repeated swaps, only after enough evidence;
- user-confirmed inferred preferences.

Memory categories:

- hard constraint: allergy, dietary exclusion;
- preference: cuisine, ingredient, chef;
- effort tolerance: active time and complexity;
- budget tendency;
- routine: preferred prep day and takeaway night;
- serving pattern.

Hard constraints never rely solely on inferred memory. Inferences store confidence, source and expiry. Users can view, correct and delete memories. Raw questions and conversations are not retained by default.

### 5.5 Recipe extraction and generation

For public and personal recipe imports:

1. Fetch only user-approved HTTP/HTTPS URLs.
2. Block private network ranges, redirects to private hosts and oversized responses.
3. Prefer JSON-LD Recipe markup and deterministic HTML extraction.
4. Use AI only to map incomplete content into the Cooksmith schema.
5. Require structured output.
6. Preserve verbatim source attribution fields separately from transformed Cooksmith fields.
7. Flag missing chef, image credit, source or uncertain quantities.
8. Duplicate-check URL, title/chef and ingredient similarity.
9. Save as draft and require confirmation.

Creating entirely new recipes is not part of the initial MVP. Cooksmith recommends and organises real attributed recipes first.

### 5.6 Meal planning engine

Meal planning is a hybrid optimisation pipeline:

1. **Eligibility filter:** remove allergy conflicts, diet conflicts and unavailable recipes.
2. **Candidate scoring:** score time fit, pantry use, ingredient overlap, budget band, feedback, cuisine variety, leftovers and prep compatibility.
3. **Constraint assembly:** represent away dates, guests, locked meals, prep choice and maximum active time.
4. **AI proposal:** select and arrange from candidate IDs, returning reasons and leftover links.
5. **Deterministic validation:** verify every recipe, date, serving count, hard constraint and lock.
6. **Repair:** replace invalid slots deterministically or retry once with validation feedback.
7. **Persist:** save plan, items, explanation summary and run metadata transactionally.

AI never invents a recipe ID. A deterministic rule-based planner is retained as the fallback when the provider is unavailable.

### 5.7 Meal prep generation

The prep engine begins with structured recipe steps:

- identify steps marked prep-suitable;
- group identical ingredient and technique tasks;
- respect food-safety and storage rules encoded in the task catalogue;
- build task dependencies;
- calculate duration from task metadata;
- fit tasks to None, Quick, Standard or Batch mode.

AI may combine wording and propose efficient sequencing, but the server validates task references and duration. Safety-sensitive tasks use curated rules, not free-form model judgement.

### 5.8 Shopping optimisation

Shopping is primarily deterministic:

1. Expand recipe ingredients for planned servings.
2. Convert compatible units.
3. Merge canonical ingredients.
4. Subtract confirmed pantry quantities.
5. Round to practical purchase amounts where a curated rule exists.
6. Group by category and retailer-friendly display name.
7. Produce plain text for Coles/Woolworths search.

AI is limited to suggesting an ingredient alias when deterministic matching fails. The suggestion must be confidence-scored and must not silently merge allergens or materially different products.

### 5.9 Recommendation engine

MVP recommendations use transparent weighted scoring:

- dietary and allergy eligibility, mandatory;
- time fit;
- pantry coverage;
- liked/loved feedback;
- never-again exclusion;
- effort and cost feedback;
- cuisine variety;
- seasonal metadata;
- chef affinity.

AI produces a short explanation from the scored factors. Later, embeddings may introduce recipe and chef similarity, with pgvector kept inside PostgreSQL. Supabase supports pgvector-based AI workloads, but it should be added only after metadata recommendations are measured. [Supabase AI and vectors](https://supabase.com/docs/guides/ai)

### 5.10 AI safety, privacy and cost controls

- Send the minimum required household context.
- Replace user names and emails with opaque IDs before model calls.
- Treat allergies as hard coded exclusions; avoid unnecessary raw health notes.
- Do not use customer data for model training unless separately and explicitly agreed.
- Store hashes and redacted summaries rather than raw prompts by default.
- Per-household and per-operation quotas.
- Account-level monthly budget alert and internal A$20 monthly MVP AI cap.
- Cheapest model tier that passes the evaluation threshold for each operation.
- Timeout, one retry and deterministic fallback.
- Record model, prompt version, latency, tokens, cost estimate and outcome.
- User confirmation before publishing imported content.
- Evaluation gate before model or prompt changes.

## 6. Security

### 6.1 Authentication and sessions

- Supabase Auth with custom SMTP.
- Secure token storage managed by the Supabase browser client.
- Magic-link redirect allow-list for local, preview and production domains.
- Session expiry and refresh handled centrally.
- Re-authentication required for destructive account and ownership changes.
- Optional MFA for administrators before public launch.

### 6.2 Authorisation and roles

| Role | Scope | Capabilities |
|---|---|---|
| Household owner | One household | Settings, invitations, membership, all household content |
| Household member | One household | Pantry, plans, shopping, prep, feedback and household recipes |
| Content editor | Global admin scope | Draft recipes, chefs, tags, imports and moderation |
| Administrator | Global admin scope | Content editor permissions, roles, audit and support operations |
| Worker service | Server-side only | Limited job-specific service actions |

RLS remains the final data boundary even when API code performs an authorisation check. Admin actions use dedicated server-side functions and are audit logged.

### 6.3 Secrets

- Browser receives only Supabase URL and publishable key.
- Service role, OpenAI, Resend and Sentry server credentials live in Supabase secret management.
- Vercel stores only frontend environment values and public monitoring configuration.
- No credentials in Git, logs, analytics, error messages or AI prompts.
- Rotate secrets on a schedule and immediately after suspected exposure.
- Separate credentials for Development, Staging and Production.

### 6.4 Rate limiting

Initial limits, configurable server-side:

| Operation | Suggested limit |
|---|---|
| Magic-link request | Supabase/SMTP controls plus 1 per minute per email/IP |
| Meal-plan generation | 10 per household per hour |
| Single-meal regenerate | 30 per household per hour |
| Recipe URL import | 10 per household per hour |
| Cooking assistant | 30 per user per hour |
| Admin bulk import | 3 concurrent jobs per administrator |
| General API | 120 requests per user per minute with endpoint overrides |

Return `429`, `Retry-After` and a friendly message. Use hashed identifiers for rate keys where possible.

### 6.5 Audit logging

Audit:

- role and membership changes;
- invitations;
- public recipe and chef changes;
- imports and publication;
- household deletion and data export;
- administrative support access;
- AI generation acceptance where it changes saved plans;
- security and rate-limit events.

Audit logs are append-only, access-restricted and exclude secrets and complete sensitive payloads.

### 6.6 Privacy considerations

This section is architectural guidance, not legal advice.

Australian Privacy Act considerations:

- Confirm whether the operating entity is covered. Some small businesses under $3 million turnover are exempt, while specified activities can still bring them within the Act. Cooksmith should design to the Australian Privacy Principles regardless because household dietary and allergy information deserves careful treatment. [OAIC small business guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/small-business)
- Publish a clear privacy policy and collection notice covering purpose, vendors, retention, AI processing and overseas recipients.
- Collect only information required for meal planning.
- Provide access, correction and deletion workflows.
- Protect personal information and destroy or de-identify it when no longer needed. [OAIC security guidance](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/guide-to-securing-personal-information)
- Assess overseas disclosures to AI, email, monitoring and analytics providers. APP 8 can make an APP entity accountable for overseas recipients. [OAIC APP 8 guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information)
- Maintain a data-breach response plan. Covered entities must notify serious eligible breaches under the NDB scheme. [OAIC Notifiable Data Breaches](https://www.oaic.gov.au/privacy/notifiable-data-breaches)

GDPR readiness if EU/UK users are served:

- lawful basis and transparent notices;
- data minimisation and purpose limitation;
- export, correction and deletion;
- consent where required for marketing and non-essential analytics;
- processor agreements and international transfer controls;
- privacy by design and retention limits.

Do not market Cooksmith as medical or nutritional advice. Allergy settings are planning constraints and cannot guarantee an external recipe or product is allergen-free.

### 6.7 Additional controls

- Content Security Policy restricting scripts, images and network destinations.
- Strict CORS allow-list for production and approved previews.
- URL importer protections against SSRF, local addresses, unsafe schemes, excessive redirects and oversized downloads.
- File type, size and malware checks for uploads.
- Signed URLs for private images.
- Database backups and tested restore procedure. Supabase offers managed backups, with point-in-time recovery dependent on plan. [Supabase database overview](https://supabase.com/docs/guides/database/overview)

## 7. Performance

### 7.1 Performance targets

| Measure | Target |
|---|---|
| Initial page usable on modern Australian mobile connection | under 3 seconds at p75 |
| Standard API read | under 500 ms at p95 excluding cold start |
| Shopping list generation | under 5 seconds |
| Fortnight AI plan | under 30 seconds |
| Prep plan from structured data | under 5 seconds synchronous, otherwise queued |
| Client interaction response | under 100 ms for local feedback |

### 7.2 Caching

- Vercel CDN caches immutable hashed frontend assets.
- Public recipe and chef list responses may use short `Cache-Control` TTLs and stale-while-revalidate.
- TanStack Query caches user reads locally and invalidates after mutations.
- Household-private responses are not shared-cacheable.
- Cache ingredient and tag reference data for the session.
- AI results are reusable only when the complete normalised input hash, prompt version and model version match.
- No separate Redis service during MVP.

### 7.3 Images

- Upload original once, create responsive delivery variants.
- Store width/height, dominant colour and alt text metadata.
- Serve AVIF or WebP where supported, with fallback.
- Lazy load below-the-fold images.
- Use `srcset` and explicit dimensions to prevent layout shift.
- Chef thumbnails approximately 256 px; recipe cards 640 px; detail images up to 1280 px.

### 7.4 Pagination and search

- Cursor pagination with default 24 recipes and maximum 100.
- Server-side filters for chef, tag, cuisine, diet and time.
- PostgreSQL full-text plus trigram search for title, chef and aliases.
- Do not load the full public recipe catalogue into the browser.

### 7.5 Lazy loading

- Route-level code splitting for Home, Recipes, Pantry, Plan, Prep, Shopping, Settings and Admin.
- Load admin code only for authorised users.
- Load drag-and-drop code with the planner route.
- Load rich image and AI explanation panels on demand.

### 7.6 Background jobs and queue

Queue these operations:

- URL recipe imports;
- bulk imports and image processing;
- fortnight plan generation if expected to exceed synchronous limits;
- large prep-plan generation;
- email and push delivery;
- reminder scheduling;
- analytics aggregation and retention cleanup.

Worker contract:

1. Claim one available job atomically.
2. Mark lock owner and expiry.
3. Execute with operation timeout.
4. Record attempt and structured error.
5. Retry transient failures with backoff and jitter.
6. Move permanently failed jobs to a dead-letter state.
7. Make handlers idempotent.
8. Surface user-visible job status through polling initially; Realtime updates are optional later.

## 8. File Storage

Supabase Storage provides file storage with access controls and optimised delivery, fitting the existing platform. [Supabase Storage](https://supabase.com/docs/guides/storage)

### 8.1 Buckets

| Bucket | Access | Contents |
|---|---|---|
| `catalogue-images` | Public read, admin write | Published recipe and chef images |
| `catalogue-drafts` | Private | Draft imports and images pending moderation |
| `household-uploads` | Private by household policy | Personal recipe images and import files |
| `job-artifacts` | Private, short retention | Bulk import reports and temporary processing outputs |

### 8.2 Path convention

```text
catalogue-images/recipes/{recipe_id}/{content_hash}.{ext}
catalogue-images/chefs/{chef_id}/{content_hash}.{ext}
catalogue-drafts/{import_job_id}/{file_id}.{ext}
household-uploads/{household_id}/recipes/{recipe_id}/{file_id}.{ext}
job-artifacts/{job_id}/{artifact_name}
```

### 8.3 Upload rules

- Browser requests a constrained upload path or uses a signed upload.
- Maximum 10 MB per image before processing.
- Allow JPEG, PNG, WebP and HEIC input; normalise delivery formats.
- Verify MIME type from bytes, not filename.
- Strip unnecessary EXIF metadata.
- Require image credit and source metadata for public catalogue images.
- Temporary imports expire automatically.
- User deletion removes database references immediately and storage objects through an idempotent cleanup job.

### 8.4 CDN strategy

- Public images delivered through Supabase's CDN.
- Content-hashed filenames allow long immutable caching.
- Private images use short-lived signed URLs and are never publicly indexed.
- Vercel caches only frontend assets, not private Supabase objects.

## 9. Notifications

### 9.1 Channel priority

1. In-app reminders and status messages.
2. Email for invitations, weekly planning prompts and failed jobs requiring action.
3. Web push after the PWA is stable and users opt in.
4. Native mobile push only if a native app is later justified.

### 9.2 Notification use cases

| Notification | Default | Timing |
|---|---|---|
| Household invitation | Email | Immediately |
| Plan next fortnight | In-app, optional email/push | User-selected day and time |
| Prep reminder | In-app, optional push | Before preferred prep session |
| Tonight's meal | In-app, optional push | User-selected local time |
| Shopping reminder | Optional push/email | Before selected shopping window |
| Import complete or failed | In-app, email only if action required | Job completion |
| Low-stock reminder | In-app only initially | Weekly summary, not constant nagging |

### 9.3 Rules

- Explicit opt-in for push and marketing email.
- Transactional and marketing preferences separated.
- Respect timezone, quiet hours and per-notification controls.
- Deduplicate by notification type, recipient and planning period.
- Include a direct route to the relevant plan, list or task.
- Never include allergy or sensitive household details in lock-screen text.

## 10. Deployment

### 10.1 Environments

| Environment | Frontend | Supabase | Data |
|---|---|---|---|
| Development | Local Vite | Dedicated development project or local Supabase | Seeded synthetic data |
| Preview/Staging | Vercel preview | One free staging Supabase project | Synthetic/test households only |
| Production | Vercel production | Production Supabase project | Real customer data |

Preview deployments must never connect to the production Supabase project. Vercel supports environment-specific and branch-specific variables. [Vercel environment variables](https://vercel.com/docs/environment-variables)

At 20 to 50 monthly active users, only the Production Supabase project should move to a paid tier when the reliability gate is reached. Development remains local and Staging remains free unless a measured limitation requires otherwise.

### 10.2 GitHub workflow

- Protect `main`.
- One branch per milestone or focused change.
- Pull request required before production merge once friend testing expands.
- Vercel preview URL attached to the pull request.
- Required checks: install, typecheck, lint, unit tests, migration lint and production build.
- Later add Playwright smoke tests against preview.
- Squash merge with a descriptive commit.

### 10.3 CI/CD sequence

```text
Feature branch
  -> GitHub Actions quality checks
  -> Vercel preview build
  -> staging database migration check
  -> review and test
  -> merge to main
  -> apply production migration
  -> deploy Edge Functions
  -> Vercel production deployment
  -> smoke test
  -> monitor and rollback if required
```

Database changes should use an expand-migrate-contract sequence so the old frontend remains compatible during rollout.

### 10.4 Database migrations

- Use Supabase CLI locally.
- Migration files named with timestamp and purpose.
- Never edit a migration already applied to shared environments.
- Include forward migration and documented rollback/mitigation.
- Test against a fresh database and a copy of the previous schema.
- Seed files contain synthetic public catalogue and pantry data only.
- Destructive migrations require backup confirmation and a separate approval.
- Generate TypeScript database types after schema change and commit them.

### 10.5 Environment variables

Frontend public variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SENTRY_DSN` if used client-side
- `VITE_APP_ENV`

Supabase Edge Function secrets:

- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `SENTRY_DSN`
- service-role credentials supplied by Supabase runtime
- allowed origins and model configuration

Secrets are never copied into `.env.example` as values. Rotation requires redeployment of affected environments.

### 10.6 Rollback

- Frontend: promote or redeploy the last known good Vercel deployment.
- Edge Functions: redeploy the previous tagged function version.
- Database: prefer forward fixes; restore only for severe corruption and follow the tested recovery procedure.
- AI: configuration feature flag can disable each AI operation and fall back to deterministic behaviour.

## 11. Testing Strategy

### 11.1 Unit tests

Use Vitest for:

- date and fortnight calculations;
- ingredient unit conversion and merging;
- pantry subtraction;
- meal eligibility and scoring;
- lock, swap and regenerate rules;
- retailer export formatting;
- prep task grouping and dependencies;
- validation schemas;
- AI response validators and fallback logic.

### 11.2 Component tests

Use React Testing Library for:

- authentication states;
- onboarding forms;
- recipe filters and accessible labels;
- planner keyboard and touch alternatives;
- save, error and retry states;
- shopping and prep completion;
- dialogs, focus management and navigation.

### 11.3 Database and integration tests

- pgTAP tests for constraints, functions and RLS.
- Test owner, member, unrelated user, content editor and anonymous access.
- Verify invitations, membership changes and data isolation.
- Test transaction rollback on partial failure.
- Test Edge Functions against a local/staging Supabase project.
- Contract tests for OpenAI and Resend adapters using fakes, not live calls in normal CI.

### 11.4 End-to-end tests

Use Playwright for critical journeys:

1. Sign in and complete onboarding.
2. Confirm starter pantry items.
3. Browse and open an attributed recipe.
4. Create and edit a personal recipe.
5. Generate, edit, lock and reorder a fortnight plan.
6. Generate and copy a shopping list.
7. Generate and complete a prep task.
8. Submit meal feedback.
9. Invite and join a household.
10. Verify unrelated households cannot access one another.

Run a smoke subset on every pull request and the full suite nightly or before release.

### 11.5 AI evaluation

Maintain versioned datasets with representative Australian households and edge cases:

- strict allergies and mixed dietary households;
- busy, normal, guest, school holiday and travel fortnights;
- empty, partial and well-stocked pantries;
- low budget and low active-time constraints;
- repeated ingredients and leftovers;
- malformed recipe pages and missing attribution;
- Australian ingredient names and retailer formatting.

Score:

- hard-constraint compliance, target 100%;
- valid recipe IDs, target 100%;
- complete 14-day coverage excluding away dates;
- active-time compliance;
- pantry use and ingredient overlap;
- variety and user edit rate;
- schema validity;
- latency and cost.

Any model or prompt change must pass the existing baseline. Generative systems need evaluation in addition to conventional tests because behaviour is variable. [OpenAI evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

### 11.6 Regression and release testing

- Fixed bug becomes a regression test where practical.
- Visual snapshots for core responsive layouts.
- Accessibility checks with axe plus manual keyboard and VoiceOver testing.
- Mobile Safari and Android Chrome device testing.
- Performance budget checked before release.
- Migration smoke test from the current production schema.

## 12. Roadmap

### Phase 1: Stable household foundation

Outcome: a dependable friend-test product with real dates and safe data.

- granular persistence and error handling;
- quality gates and tests;
- production SMTP;
- household membership and settings;
- pantry, fridge and freezer with Australian staples;
- relational recipe, chef and ingredient catalogue;
- personal recipe CRUD;
- admin recipe import foundation;
- date-based fortnight planner without AI.

### Phase 2: Planning and smart shopping

Outcome: Cooksmith proposes a useful fortnight and produces an accurate list.

- Edge Function API and AI provider abstraction;
- constraint-based candidate engine;
- AI fortnight plan generation;
- lock, swap and regenerate;
- deterministic shopping aggregation and pantry subtraction;
- Coles/Woolworths copy export;
- monitoring, quotas and AI evaluation.

### Phase 3: Prep and learning

Outcome: the plan becomes easier to execute and suggestions improve.

- structured prep profiles and tasks;
- Quick, Standard, Batch and None modes;
- meal feedback;
- inspectable household memory;
- transparent recommendations;
- planning, meal, prep and shopping reminders.

### Future AI and commercial capability

- semantic recipe and chef discovery;
- seasonal and budget optimisation;
- automatic pantry learning with confirmation;
- image-assisted pantry input;
- retailer APIs where commercially justified;
- native applications only if PWA limitations become material;
- Stripe subscriptions and entitlements after monetisation validation.

## 13. Codex Implementation Plan

Each milestone should be implemented on its own branch, include tests and leave the application deployable. Database migrations are additive unless the milestone explicitly includes a safe data migration. Codex must run `npm run build` and all available checks before handover.

### Milestone 1: Restore the quality baseline

- Add ESLint flat configuration.
- Pin dependency version ranges.
- Add `typecheck`, unit-test and CI scripts.
- Create GitHub Actions for lint, typecheck, tests and build.
- **Done when:** all checks pass without changing product behaviour.

### Milestone 2: Establish environment and migration discipline

- Add Supabase CLI configuration, migration conventions and seed structure.
- Document Development, Staging and Production variables.
- Generate typed database definitions.
- **Done when:** a fresh local database can be built from migrations and seed data.

### Milestone 3: Replace destructive collection writes

- Implement row-level create, update and delete for personal recipes, pantry and plan.
- Add mutation status and retry.
- Remove delete-all/reinsert effects.
- **Done when:** failed writes cannot erase the existing collection and concurrency tests pass.

### Milestone 4: Migrate meal plans to real dates

- Add `meal_plans` and date-based `meal_plan_items` schema.
- Migrate current weekday data into the active week where possible.
- Preserve current UI compatibility temporarily.
- **Done when:** two different weeks can coexist without overwriting one another.

### Milestone 5: Modularise navigation and frontend features

- Add React Router.
- Split App, Auth, Recipes, Pantry, Planner and Shopping into feature modules.
- Add route-level loading and error boundaries.
- **Done when:** browser back, refresh and direct routes work and visual behaviour is preserved.

### Milestone 6: Add dependable save and error UX

- Standardise loading, empty, saving, saved, offline and error states.
- Map provider errors to Cooksmith messages.
- Add Sentry integration behind environment configuration.
- **Done when:** every mutation visibly succeeds or fails with retry and a correlation ID.

### Milestone 7: Productionise authentication email

- Configure Resend SMTP guidance and branded templates.
- Add resend cooldown, expired-link help and rate-limit messaging.
- Validate redirect allow-lists.
- **Done when:** friend-test login works reliably without exposing provider jargon.

### Milestone 8: Add household membership and roles

- Create memberships, invitations, app roles and updated RLS.
- Migrate existing profiles as household owners.
- Add pgTAP isolation tests.
- **Done when:** owner/member/unrelated-user permissions behave as specified.

### Milestone 9: Build household onboarding and settings

- Capture household name, servings, time limits, prep preference, store, skill and dietary requirements.
- Add inspectable settings route.
- **Done when:** a new household completes setup in under 10 minutes in usability testing.

### Milestone 10: Implement household invitations

- Secure token creation, email, acceptance and member removal.
- Prevent owner self-removal and last-owner deletion.
- Audit membership events.
- **Done when:** a second user can join and share household data safely.

### Milestone 11: Upgrade pantry, fridge and freezer

- Add locations, structured quantities, units and stock status.
- Seed Australian pantry staples with bulk confirm/remove UX.
- Add edit and low-stock views.
- **Done when:** onboarding can create a useful inventory quickly without typing every item.

### Milestone 12: Add canonical ingredients and aliases

- Create category, ingredient and alias tables.
- Seed common Australian terms and units.
- Add deterministic matching service and tests.
- **Done when:** recipe and pantry items can resolve to canonical ingredients without AI for common cases.

### Milestone 13: Create the shared recipe catalogue

- Add recipe, ingredient, step and tag schema.
- Migrate the 12 seeded recipes from source code.
- Add paginated server-side search.
- **Done when:** public recipes can change without a frontend deployment.

### Milestone 14: Add chefs, attribution and images

- Implement chef records, recipe source fields and image buckets.
- Add responsive recipe/chef image components and credits.
- Enforce publication attribution constraints.
- **Done when:** every public recipe visibly identifies chef, source and image credit.

### Milestone 15: Complete personal recipe CRUD

- Create, edit, duplicate and archive personal recipes.
- Add structured ingredients, real method steps and full validation.
- **Done when:** a household can maintain a complete private recipe without placeholder instructions.

### Milestone 16: Add administration roles and console

- Protected admin routes and server-side role checks.
- Recipe, chef, tag and moderation screens.
- Audit every content mutation.
- **Done when:** a content editor can manage drafts but cannot access household-private content.

### Milestone 17: Build bulk recipe import

- CSV/JSON upload, job status, row validation and duplicate detection.
- Draft-only output with issue report.
- Add URL importer security controls.
- **Done when:** a batch can be imported, reviewed and retried without partial publication.

### Milestone 18: Establish the versioned Edge Function API

- Implement `api-v1`, JWT middleware, correlation IDs, standard errors, validation and rate limiting.
- Add typed client and contract tests.
- **Done when:** representative household and catalogue endpoints pass integration tests.

### Milestone 19: Deliver the fortnight planner UI

- Rolling 14-day dates, next/previous navigation and current-period state.
- Drag, keyboard move, remove, custom meal and servings.
- Add scenarios for busy, normal, guests, school holidays and travel.
- **Done when:** a user can manually complete a fortnight plan on mobile in under 15 minutes.

### Milestone 20: Build deterministic smart shopping

- Scale ingredients by servings.
- Convert units, merge duplicates and subtract pantry.
- Persist list and purchased state.
- **Done when:** golden test plans generate exact expected shopping lists.

### Milestone 21: Add Coles/Woolworths export

- Retailer-friendly aliases and plain-text formatter.
- One-tap copy and device share.
- Clear fallback instructions.
- **Done when:** the exported list pastes cleanly into retailer search from mobile.

### Milestone 22: Build the deterministic meal prep engine

- Prep-suitable metadata, task grouping, dependencies and duration calculation.
- None, Quick, Standard and Batch modes.
- Prep plan and task completion UI.
- **Done when:** fixed recipe sets produce stable, safe and correctly ordered prep tasks.

### Milestone 23: Add the AI platform foundation

- OpenAI adapter, provider interface, structured outputs, prompt modules and `ai_runs`.
- Per-household quotas, A$20 account budget policy, timeout, retry, redaction and feature flags.
- Route each operation to the cheapest model tier that passes its evaluation threshold.
- Initial evaluation dataset and fake provider for tests.
- **Done when:** a schema-valid non-production AI operation runs with complete observability, estimated cost reporting and no browser secret.

### Milestone 24: Generate AI-assisted fortnight plans

- Candidate selection, scoring, prompt orchestration and validation.
- Deterministic fallback.
- Async status and editable result.
- **Done when:** evaluation hard constraints pass 100% and generation completes within 30 seconds at target percentile.

### Milestone 25: Add lock, swap and regenerate intelligence

- Lock persistence, reason-aware swap candidates and single-meal regeneration.
- Preserve all unaffected dates.
- Explain suggestions using scored factors.
- **Done when:** locked meals never change and each action is independently reversible.

### Milestone 26: Add feedback and household memory

- Loved, Liked, Never again and effort/cost/spice reasons.
- Derive inspectable preferences with confidence and expiry.
- Add memory view, correction and deletion.
- **Done when:** feedback changes future scoring and users can see exactly what Cooksmith learned.

### Milestone 27: Add notifications, analytics and operational dashboards

- Planning, prep, meal and shopping reminder preferences.
- Resend transactional email and in-app notifications.
- First-party success events, job health and Sentry dashboards.
- Add a monthly cost dashboard showing provider spend, active households, AI cost per operation and cost per active household.
- **Done when:** reminders respect timezone/quiet hours and product success metrics and operating cost are measurable without sensitive payloads.

### Milestone 28: Production hardening and friend-test release

- Full Playwright regression, accessibility, performance and security checks.
- Data export/deletion, retention jobs, privacy notices and breach runbook.
- Backup restore rehearsal, rollout flags and rollback test.
- Confirm free-tier terms, production upgrade gates, spend caps and an expected monthly operating envelope.
- **Done when:** launch checklist passes, known risks are accepted and the friend-test environment can be supported and recovered within the agreed cost envelope.

## 14. Architecture Decision Record Summary

| Decision | Choice | Reason |
|---|---|---|
| Frontend stack | Reuse React/Vite, rebuild the target application structure | The technology is sound while the prototype composition is not the long-term design |
| Implementation posture | Greenfield target architecture with selective reuse in the existing repository | Replace prototype constraints without wasting proven platform, brand and interaction work |
| Core platform | Supabase | Existing investment, RLS, Auth, PostgreSQL and Storage in one platform |
| Trusted backend | Supabase Edge Functions | Keeps secrets and orchestration close to Auth and data |
| Frontend hosting | Vercel | Existing automatic GitHub previews and production deployment |
| AI provider | OpenAI behind interface | Strong structured-output support without coupling product logic to one model |
| Shopping calculations | Deterministic | Accuracy, repeatability and testability |
| Meal plan generation | Hybrid rules plus AI | Hard constraints stay reliable while AI improves arrangement and explanation |
| Memory | Structured and inspectable | Privacy, correction and user trust |
| Search | PostgreSQL first | Adequate for MVP and avoids premature vector infrastructure |
| Queue | Supabase/PostgreSQL worker | Avoid another vendor until workload proves it necessary |
| Payments | Deferred Stripe | Monetisation is not yet validated |
| Cost posture | Free tiers for testing, one paid production stack when justified | Keep baseline low and require evidence before adding vendors or capacity |

## 15. Final Recommendation

Use the separate Cooksmith Implementation Roadmap as the authoritative execution sequence. Follow the active delivery ADR: ADR 009 uses reviewed feature branches targeting `main` temporarily, with staging restored before public beta.

Build the household, pantry and recipe foundations before AI. Cooksmith's intelligence will only be as dependable as the constraints and content supplied to it. Once recipes, ingredients, household settings and fortnight dates are structured, AI can do the useful bit: prepare a sensible answer before the user has to ask.

For the initial 20 to 50 monthly users, keep Development local, Staging free and Production on free tiers until the reliability or commercial-use gates are reached. The expected steady-state commercial baseline is approximately A$70 to A$90 per month, with any move above A$100 requiring an explicit architecture and value review.
