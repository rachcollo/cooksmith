# CS-48 handover: Automatic Pantry Categorisation

- **Date:** 2026-07-19
- **Branch:** `feat/cs-48-automatic-pantry-categorisation`
- **Target:** `main`
- **Baseline:** `1cbb3debd9b03a2803b916d7394ca7734db76a15`
- **Commit:** Pending
- **Pull request:** Pending
- **Status:** Implemented; CI database and hosted Preview validation pending

## Objective

Let a household member add food by name while Cooksmith assigns its likely storage location and category, leaving the user to correct only exceptions.

## Product impact

- **Product Principles supported:** quiet helpfulness, minimum household effort, trustworthy correction.
- **User effort removed:** category and location selection during normal Pantry add.
- **Primary next action improved:** entering a name and selecting Add item is sufficient.
- **Product behaviour changed:** Yes. Classification is deterministic and corrections survive renames and refreshes.

## Changes made

- Added a versioned, framework-independent classification decision table.
- Added safe unknown/conflict fallback behaviour.
- Removed location and category controls from Pantry add while retaining them in Edit.
- Persisted per-field automatic/explicit provenance and classification version.
- Reclassified automatic values on rename while preserving explicit choices.
- Added unit, integration and pgTAP contract coverage.

## Files and components affected

| File or component                                       | Purpose                                              |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `src/domain/pantry/classification.ts`                   | Deterministic rule version 1                         |
| `src/domain/pantry/types.ts` and validation             | Expanded typed contract and provenance               |
| `src/routes/PantryPage.tsx`                             | Minimal add and correction-preserving edit behaviour |
| `src/infrastructure/pantry/supabasePantryRepository.ts` | Persisted provenance and rule version                |
| `20260719230000_automatic_pantry_categorisation.sql`    | Additive Pantry data model                           |
| Pantry unit, integration and pgTAP tests                | Decision table, rename and persistence evidence      |

## Migrations

`supabase/migrations/20260719230000_automatic_pantry_categorisation.sql`

The PR does not deploy Production. After merge, use the protected Production database release workflow with the exact approved `main` SHA. Dry-run and migration-history verification are mandatory. Do not edit the released migration; use a forward fix if required.

## Tests run

| Command or check                    | Result      | Notes                                |
| ----------------------------------- | ----------- | ------------------------------------ |
| `npm ci`                            | Passed      | Writable managed-runner cache used   |
| `npm run preflight`                 | Passed      | Correct branch and remote verified   |
| `npm run format:check`              | Passed      | Prettier clean                       |
| `npm run lint`                      | Passed      | No warnings                          |
| `npm run typecheck`                 | Passed      | TypeScript clean                     |
| `npm run test`                      | Passed      | 169 tests                            |
| `npm run build`                     | Passed      | Production build complete            |
| `npm run docs:commands:check`       | Passed      | 117 files audited                    |
| `npm run db:config:check`           | Passed      | 17 migrations valid                  |
| `npm run engineering:check-secrets` | Passed      | No tracked secrets/environment files |
| `npm run test:e2e`                  | Unavailable | Chromium executable absent           |
| `npm run db:validate`               | Unavailable | Docker runtime absent                |

## Preview or verification instructions

Using synthetic data on desktop and mobile:

1. Add Milk, Chicken breast, Frozen peas, White rice, Apples and Dishwashing tablets by name only.
2. Confirm each card shows the expected category/location and “Cooksmith suggested”.
3. Add an unknown and a conflicting name such as Milk rice; confirm Other/Uncategorised.
4. Edit a suggested item, explicitly change one field, rename it, save and refresh.
5. Confirm the explicit field is preserved and any still-automatic field is recalculated.
6. Confirm Pantry filters, availability, removal and household isolation remain intact.

## Accessibility, security, privacy and cost

- **Accessibility:** Add removes two controls; Edit retains labelled native selects and keyboard-operable dialog behaviour. Manual mobile, keyboard and screen-reader Preview checks remain.
- **Security and privacy:** Existing RLS and active-household membership checks are unchanged. Classification uses only the submitted item name and no cross-household learning.
- **Cost impact:** A$0/month and A$0/year.
- **Credential check:** Repository secret/environment-file scan passed.

## Known limitations

Local database and browser automation could not run in this managed runner. CI must validate reset, lint, pgTAP, RLS and generated-type freshness; hosted Preview needs human validation.

## Deferred work

CS-55 owns the compact Pantry modal/layout. LLM classification, nutrition/allergen inference, retailer aisles, consumption, expiry and cross-household learning remain out of scope.

## Rollback approach

Revert application behaviour. Once the additive migration is released, leave enum values/columns in place and use a forward migration for schema corrections.

## Recommended next milestone

CS-55 may begin only after CS-48 is accepted and its database release is complete.
