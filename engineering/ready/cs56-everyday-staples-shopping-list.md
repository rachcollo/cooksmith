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

## Scope

### Included

- First-time **Everyday staples** setup, reachable from Shopping or Pantry, with a clear yes/no choice for each suggested fresh staple.
- Household-scoped recurring staple create, edit, remove, pause and resume behaviour.
- Automatic, idempotent insertion of active staples once per shopping week.
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

## Functional Requirements

### FR-1 — Confirm suggested staples

**Acceptance criteria**

- [ ] A household member can open setup from Shopping or Pantry.
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

### FR-3 — Add active staples once per week

**Acceptance criteria**

- [ ] At the approved shopping-week boundary, each active recurring staple is considered once for the household's current shopping list.
- [ ] Retrying, refreshing or concurrent attempts do not create duplicate items or repeat the same weekly contribution.
- [ ] Paused or removed staples are not added in later weeks.
- [ ] Removing an automatically added item from the current list suppresses only that week's occurrence; it does not remove or pause the recurring staple.
- [ ] A recurring-generated item is visibly and accessibly identifiable in Shopping.

### FR-4 — Reconcile duplicates without losing useful data

**Acceptance criteria**

- [ ] Name matching follows one deterministic normalisation rule across manual, recipe-generated and recurring sources.
- [ ] An existing item is reused instead of creating an obvious duplicate.
- [ ] Reconciliation preserves manual intent and existing CS-22 contribution behaviour.
- [ ] Quantity/unit conflicts follow the product-owner-approved rule recorded before implementation; incompatible values are never silently summed or overwritten.
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
- Use household-local calendar dates and the existing Monday week-start utility unless the open shopping-week decision approves a different boundary.
- Keep migrations additive, schema-qualified and safe for existing households. Released migrations remain immutable.
- Enforce RLS and least privilege at the database boundary; client-provided household identifiers are never authorisation evidence.

## Technical Direction

- Keep recurrence and duplicate decisions in typed domain/application boundaries, with one authorised persistence operation for weekly insertion.
- Reuse existing Shopping UI, validation and repository patterns; reuse CS-48 classification only through an explicit shopping-category mapping.
- Prefer an idempotent database operation or constraint-backed transaction for weekly insertion and suppression.
- Do not add a scheduler or hosted provider until the trigger decision below is approved.
- No new dependency or recurring cost is expected.

## Test Plan

### Unit and component

- Suggested-item yes/no state, recurring validation, week-key calculation, matching and quantity/unit decision table.
- Setup and management loading, empty, busy, error and recovery states.
- Pause/resume, current-week removal, provenance label, keyboard focus, accessible names and mobile reflow.

### Integration, database and RLS

- Setup persists household-scoped choices and management changes survive refresh.
- First weekly insertion, repeat/concurrent insertion, pause, resume and current-week suppression.
- Manual, CS-22 and recurring duplicate combinations preserve approved provenance and quantity/unit behaviour.
- Owner/member access plus inactive, unrelated, unauthenticated and forged-household denial using real RLS.
- Fresh reset, database lint, pgTAP, API contracts and generated-type freshness.

### End-to-end and hosted preview

- Complete first-time setup on mobile, manage a staple, trigger the approved weekly insertion path and identify the recurring item.
- Remove the current occurrence, confirm the recurring preference remains, and verify it can be paused.
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
- **Expected Edge Function impact:** None unless a separately approved trigger design requires one.
- **Production deployment:** This package PR does not deploy Production. After implementation is merged, release database migrations only through the protected Production database workflow using the exact approved `main` SHA, mandatory dry-run and migration-history verification. Fix released migrations with a new forward migration.
- **Rollback:** Revert application behaviour before release; after database release, disable recurrence insertion and use an additive forward fix while preserving household preferences.
- **Dependencies/provider:** No new dependency or provider expected.
- **Recurring cost:** A$0 per month / A$0 per year.

## Deferred Work / Open Questions

- Product owner must approve the shopping-week lifecycle and insertion trigger before implementation: first Shopping view, planner/list creation, or a scheduled/background process. Current `main` has one persistent active list and no weekly rollover, so this choice materially affects suppression and completed-item behaviour.
- Product owner must define “most useful quantity/unit” when an existing manual or CS-22 item conflicts with a recurring default, including whether a missing value may be filled and how incompatible units are displayed. Implementation must use a documented decision table rather than guessing.
- Confirm whether setup must be linked from both Shopping and Pantry or whether either location satisfies the story's “shopping or pantry” acceptance criterion.

## PR Requirements

PR title: `CS-56: Everyday staples shopping list`

Include Jira/package links, approved trigger and quantity/unit decisions, delivered behaviour, migration and Edge Function declarations, RLS/security evidence, automated checks, Preview URL and mobile/accessibility evidence, limitations, rollback and A$0 cost impact.
