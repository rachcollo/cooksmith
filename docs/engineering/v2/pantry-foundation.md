# Pantry foundation

Milestone 7A introduces a private, household-owned pantry foundation for shelf-stable items only. Each item belongs to exactly one household and records a name, controlled category, optional quantity, optional unit, availability and whether it came from the curated default catalogue.

## Domain model

- `cooksmith.household_pantry_items` is the private table for shelf-stable pantry entries.
- `household_id` anchors every row to the household tenant.
- `normalised_name` is generated from `lower(btrim(name))` and is unique per household, preventing case-insensitive duplicates.
- `quantity` and `unit` are nullable so the foundation does not imply exact inventory tracking; quantity is non-negative when present.
- `category` uses stable enum identifiers for Baking, Breakfast, Canned and jarred, Condiments and sauces, Grains/rice/pasta, Herbs and spices, Oils and vinegars, Snacks, Tea/coffee/drinks and Other.
- `created_by` and `updated_by` are derived in a database trigger from `auth.uid()` for browser writes, preventing caller-supplied identity spoofing.

## Default Australian catalogue

The default catalogue is deterministic, shelf-stable and intentionally ordinary: flour, baking supplies, breakfast cereals, rice, pasta, tinned and jarred staples, sauces, oils, vinegars, herbs, spices, drinks, snacks and stock/breadcrumb staples. It deliberately excludes non-shelf-stable ingredients.

## Population strategy

`cooksmith_private.populate_default_pantry` inserts defaults with `on conflict do nothing`, making population idempotent. It is a private database operation: browser roles are not granted execute access. The migration backfills all active households, and an `after insert` trigger on `cooksmith.households` automatically populates future households. The trigger means onboarding household creation does not need a browser-side privileged step.

## Permissions and RLS

Owners and members with active household membership can select, insert, update and delete pantry rows for their own household. RLS uses `cooksmith.is_active_household_member(household_id)` for every allowed operation. Unauthenticated, inactive, unrelated and application-role-only users receive no rows and cannot mutate rows through identifier substitution. Application roles do not bypass household membership.

## Future boundaries

Milestone 7A deliberately excludes cold-storage locations, non-shelf-stable ingredients, expiry tracking, recipe matching, meal planning, shopping-list integration, barcode scanning and AI. Later Pantry milestones may add richer item metadata and shopping hand-offs, but must keep household RLS as the final privacy boundary.

## Migration release requirement

The migration is committed for review only. It must not be applied to Production outside the protected Production database release workflow, including reviewed target commit, backup/forward-fix plan and post-release smoke verification.
