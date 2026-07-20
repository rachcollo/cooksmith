# Engineering Package — CS-56: Everyday Staples Shopping List

## Metadata

- **Milestone:** M10C
- **Title:** Everyday Staples Shopping List
- **Jira issue:** [CS-56](https://smillins.atlassian.net/browse/CS-56)
- **Epic:** Shopping
- **Status:** `Ready`
- **Branch:** `feat/cs-56-everyday-staples-shopping-list`
- **Depends on:** CS-22
- **Blocks:** None
- **Package path:** `engineering/ready/cs56-everyday-staples-shopping-list.md`

## Product Outcome

Let a household confirm the fresh basics it buys most weeks, then quietly add active staples to the household shopping list without requiring pantry stock tracking or repeated manual entry. The experience must remain quick on mobile and clearly distinguish a current-week shopping item from the recurring preference that created it.

## Current Baseline

- `main` has one active, household-owned shopping-list container and household-isolated item CRUD. Item names are unique per household after case and surrounding-whitespace normalisation.
- Planned-meal ingredients coexist through contribution records and reconciliation that preserves manual items.
- Pantry staples are a separate inventory-style model. CS-48 provides deterministic food classification rules that may be reused where the shopping category mapping is compatible.
- Planner weeks are household-local Monday-to-Sunday date ranges. The shopping-list model does not yet have a week key, rollover lifecycle or recurring-item provenance.

## Approved Product Decisions

- The CS-56 shopping week is the household-local Monday-to-Sunday planner week.
- Opening Shopping is the authorised reconciliation trigger. The first Shopping view in a new week considers every active recurring staple; repeat views, refreshes and concurrent requests remain idempotent.
- An unchecked matching item is preserved. A completed recurring occurrence from an earlier week is reactivated by marking it unchecked for the new week.
- Removing the current recurring occurrence suppresses that staple for the rest of the current week without deleting or pausing the saved preference. It becomes eligible again the following Monday.
- Shopping is the primary setup and management entry point. Pantry provides a small shortcut to the same experience where practical; Pantry does not own a second management flow.
- A matching item uses one visible shopping row. An explicit manual quantity/unit is authoritative. A recurring default may fill a missing value. Compatible recipe and recurring quantities may be converted and combined deterministically; incompatible or unrecognised units are never guessed, summed or overwritten.
- No scheduler, background job, Edge Function or paid provider is authorised for this version.

## Scope

### Included

- First-time **Everyday staples** setup and management from Shopping, with a small Pantry shortcut where practical, and a clear yes/no choice for each suggested fresh staple.
- Household-scoped recurring staple create, edit, remove, pause and resume behaviour.
- Automatic, idempotent reconciliation of active staples when Shopping is first opened in a household-local Monday-to-Sunday week.
- Recurring provenance on generated shopping items and current-list removal without deleting the recurring preference.
- Duplicate reconciliation with existing manual, planned-meal-generated and recurring items.
- Mobile-first, accessible setup and compact management states.
- Additive database, RLS, generated-type and automated-test changes required by the approved data contract.

### Explicitly Out of Scope

- Pantry stock counts, consumption, expiry or automatic Pantry mutations.
- Retailer ordering, reminders, notifications or paid/background providers.
- Recipe ingredient generation beyond preserving the existing CS-22 contract.
- Nutrition, allergy or food-safety inference.
- Multiple independently named shopping lists.
- Configurable week-start days or undated meal-slot planning, which are tracked separately in CS-61.

## Functional Requirements

### FR-1 — Confirm suggested staples

**Acceptance criteria**

- [ ] A household member can open setup and management from Shopping.
- [ ] Pantry provides a compact shortcut to that same experience where practical and does not duplicate recurring-staple state or management UI.
- [ ] First-time setup presents a concise curated list including common examples such as milk, yoghurt, fruit, bread, eggs, cheese, vegetables and lunchbox snacks.
- [ ] Every suggestion has an explicit yes/no choice; only confirmed items are saved.
- [ ] Setup is fast to complete by touch or keyboard at 320 CSS pixels without horizontal overflow.
- [ ] Saved staples belong to the active household and never to an individual user alone.

### FR-2 — Manage the recurring list

**Acceptance criteria**

- [ ] Active household members can add, edit and remove a recurring staple.
- [ ] A staple can be paused and resumed without losing its saved details.
- [ ] Name is required; quantity, unit and category/location hint are optional and validated consistently with Shopping.
- [ ] Loading, empty, busy, success, validation-error and recoverable-failure states are explicit.
- [ ] Accessible names, focus behaviour and 44-pixel touch targets support mobile and keyboard use.

### FR-3 — Reconcile active staples on the first Shopping view each week

**Acceptance criteria**

- [ ] The household-local week key uses Monday as its start and Sunday as its end, consistently with the current meal planner.
- [ ] Opening Shopping authorises reconciliation; the first view in a new week considers every active recurring staple for the current household list without requiring a scheduler.
- [ ] Retrying, refreshing or concurrent attempts do not create duplicate items or repeat the same weekly contribution.
- [ ] Paused or removed staples are not added in later weeks.
- [ ] If a matching item is already unchecked, reconciliation leaves its completion state and user-authored values unchanged.
- [ ] If a prior recurring occurrence remains completed when a new week begins, reconciliation reactivates it by marking it unchecked and records the new weekly occurrence.
- [ ] Removing an automatically added item from the current list suppresses only that week's occurrence; it does not remove or pause the recurring staple.
- [ ] A suppressed staple is not recreated by another view, refresh or household member during that week and becomes eligible again the following Monday.
- [ ] A recurring-generated item is visibly and accessibly identifiable in Shopping.

### FR-4 — Reconcile duplicates without losing useful data

**Acceptance criteria**

- [ ] Name matching follows one deterministic normalisation rule across manual, recipe-generated and recurring sources.
- [ ] An existing item is reused instead of creating an obvious duplicate.
- [ ] Reconciliation preserves manual intent and existing CS-22 contribution behaviour.
- [ ] An explicit manual quantity/unit remains authoritative and is never silently overwritten or increased by recurrence.
- [ ] A recurring default fills quantity/unit only when the reused shopping item has no authoritative displayed value.
- [ ] Compatible CS-22 recipe and recurring quantities are converted to a deterministic common unit and combined, for example 2 L plus 500 ml becomes 2.5 L.
- [ ] Incompatible, free-text or unrecognised units are not guessed, converted, summed or overwritten; the existing displayed quantity is preserved and the item remains identifiable as both recipe-generated and recurring.
- [ ] Removing or pausing a recurring staple does not delete a manual or recipe contribution with the same name.

### FR-5 — Preserve household isolation

**Acceptance criteria**

- [ ] Only active household members can read or mutate recurring staples and weekly contributions for that household.
- [ ] Owner/member success and inactive, unrelated, unauthenticated and forged-identifier denial are proven with real database policies.
- [ ] Switching household clears prior setup, recurring and generated-item state before showing the next household.

## Data and Domain Requirements

- Add a household-owned recurring-staple model with validated name, optional default quantity/unit and shopping category, active/paused state and audit fields.
- Record enough weekly contribution or suppression provenance to make insertion idempotent and distinguish removing the current occurrence from changing recurrence.
- Preserve the existing shopping-item uniqueness and CS-22 contribution contracts, extending provenance rather than replacing them.
- Use household-local calendar dates and the existing Monday week-start utility. Keep week-key calculation behind a shared typed boundary so future CS-61 configuration can replace the fixed boundary without rewriting recurrence persistence.
- Keep migrations additive, schema-qualified and safe for existing households. Released migrations remain immutable.
- Enforce RLS and least privilege at the database boundary; client-provided household identifiers are never authorisation evidence.

## Technical Direction

- Keep recurrence and duplicate decisions in typed domain/application boundaries, with one authorised persistence operation for weekly insertion.
- Reuse existing Shopping UI, validation and repository patterns; reuse CS-48 classification only through an explicit shopping-category mapping.
- Prefer an idempotent database operation or constraint-backed transaction for weekly insertion and suppression.
- Reconcile through one authorised operation invoked by Shopping load; do not add a scheduler, background job or Edge Function.
- No new dependency or recurring cost is expected.

## Test Plan

### Unit and component

- Suggested-item yes/no state, recurring validation, Monday week-key calculation, matching and the approved quantity/unit decision table.
- Setup and management loading, empty, busy, error and recovery states.
- Pause/resume, new-week reactivation, current-week suppression, provenance label, keyboard focus, accessible names and mobile reflow.

### Integration, database and RLS

- Setup persists household-scoped choices and management changes survive refresh.
- First weekly reconciliation, repeat/concurrent reconciliation, completed-item reactivation, pause, resume and current-week suppression through the next Monday boundary.
- Manual, CS-22 and recurring duplicate combinations prove manual precedence, missing-value fill, compatible conversion/addition and incompatible-unit preservation.
- Owner/member access plus inactive, unrelated, unauthenticated and forged-household denial using real RLS.
- Fresh reset, database lint, pgTAP, API contracts and generated-type freshness.

### End-to-end and hosted preview

- Complete first-time setup on mobile, manage a staple, open Shopping to trigger weekly reconciliation and identify the recurring item.
- Remove the current occurrence, confirm repeat Shopping views respect suppression, confirm the recurring preference remains, and verify it can be paused.
- Cross a synthetic Monday boundary and confirm a completed prior occurrence is reactivated while an unchecked matching item remains unchanged.
- Exercise manual and recipe-generated duplicates and household switching with synthetic households.
- Validate keyboard use, focus, axe, 320/375-pixel layouts and desktop layout on the exact Vercel Preview.

## Quality Gates

- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Applicable Playwright, responsive and axe suites pass.
- [ ] Database reset, lint, pgTAP, RLS and generated-type freshness pass.
- [ ] Package readiness validation passes.
- [ ] No secrets, credentials, real household data or environment files are committed.
- [ ] GitHub Actions and Vercel checks pass on the exact PR head.
- [ ] Hosted Preview evidence is recorded honestly.

## Release, Rollback and Cost

- **Expected migration impact:** Yes, additive recurring-staple and weekly provenance/suppression storage with RLS.
- **Expected Edge Function impact:** None. Shopping load invokes the authorised reconciliation operation.
- **Production deployment:** This package PR does not deploy Production. After implementation is merged, release database migrations only through the protected Production database workflow using the exact approved `main` SHA, mandatory dry-run and migration-history verification. Fix released migrations with a new forward migration.
- **Rollback:** Revert application behaviour before release; after database release, disable recurrence insertion and use an additive forward fix while preserving household preferences.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## Deferred Work

- CS-61 owns configurable week-start days and undated meal-slot planning. CS-56 implements the approved Monday-to-Sunday boundary now, while keeping week calculation behind a shared typed boundary so CS-61 can extend it later.
- Retailer ordering, reminders, notifications, multiple named lists and Pantry inventory automation remain outside CS-56.

## PR Requirements

PR title: `CS-56: Everyday staples shopping list`

Include Jira/package links, the Shopping-view trigger, Monday week key, completed-item reactivation, current-week suppression and quantity/unit decision evidence, delivered behaviour, migration and Edge Function declarations, RLS/security evidence, automated checks, Preview URL and mobile/accessibility evidence, limitations, rollback and A$0 cost impact.
