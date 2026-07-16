# Pantry foundation

Milestone 7A introduces a private, household-owned pantry foundation. Each item belongs to exactly one household and records a name, category, storage location, non-negative quantity, unit, availability and whether it came from the curated default catalogue.

## Domain model

- `cooksmith.household_pantry_items` is the private table for pantry, fridge and freezer entries.
- `household_id` anchors every row to the household tenant.
- `normalised_name` is generated from `lower(btrim(name))` and is unique per household, preventing case-insensitive duplicates.
- `quantity` is numeric and constrained to `0..99999`; `available` persists whether the household currently has the item.
- `category` and `storage_location` are enums so application filters remain stable and accessible.

## Default Australian catalogue

The default catalogue is deterministic and intentionally ordinary: flour, sugar, oats, rice, pasta, olive oil, Vegemite, soy sauce, tinned tomatoes, tuna, chickpeas, salt, pepper, mixed herbs, milk, eggs, butter, cheddar and frozen peas. Defaults are categorised across staples, baking, canned goods, condiments, spices, fresh and frozen storage.

## Population strategy

`cooksmith_private.populate_default_pantry` inserts defaults with `on conflict do nothing`, making population idempotent. The migration backfills all active households, and an `after insert` trigger on `cooksmith.households` automatically populates future households. The trigger means onboarding household creation does not need a browser-side privileged step.

## Permissions and RLS

Owners and members with active household membership can select, insert, update and delete pantry rows for their own household. RLS uses `cooksmith.is_active_household_member(household_id)` for every allowed operation. Unauthenticated, inactive and unrelated users receive no rows and cannot mutate rows through identifier substitution. Application roles do not bypass household membership.

## Future boundaries

Milestone 7A deliberately excludes expiry tracking, recipe matching, meal planning, shopping-list integration, barcode scanning and AI. Later Pantry milestones may add richer item metadata and shopping hand-offs, but must keep household RLS as the final privacy boundary.

## Migration release requirement

The migration is committed for review only. It must not be applied to Production outside the protected Production database release workflow, including reviewed target commit, backup/forward-fix plan and post-release smoke verification.
