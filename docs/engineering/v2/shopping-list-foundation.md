# Shopping list foundation

CS-21 introduces one active, household-private shopping list and a deliberately small manual-item workflow. The browser reads the current household's items and may add, edit, complete, restore or remove them. PostgreSQL remains authoritative for household ownership, validation and access.

`shopping_lists` provides the durable container and version boundary needed by later generated-list work. `shopping_list_items` stores display name, optional quantity and unit, grocery category, completion, provenance and ordering. New and existing active households receive one active list. CS-21 writes manual items only; CS-22 owns generation from the meal plan.

RLS grants list-container reads and item CRUD only to active household members. Audit triggers derive user identity from `auth.uid()`. The client never supplies or trusts an actor identity, and a private helper resolves the active list for an inserted item.

The UI groups needed items by grocery category and moves completed items to a separate section. Completion is reversible. Duplicate names are rejected case-insensitively within a household.

This foundation excludes Pantry reconciliation, multiple lists, retailer export, reminders, scanning and AI.

## Generation from the meal plan (CS-22)

The Shopping page offers "Add this week's meals". It reads this week's planned meals and the recipe library through the existing repositories, flattens ingredients from linked recipes (structured rows first, multiline text as fallback), merges duplicate names case-insensitively (summing numeric quantities only when units match), skips names already on the list, and assigns a deterministic keyword-based grocery category. A preview dialog names every addition and requires confirmation before a single batch insert records the items with `manual = false` provenance. Generated items behave exactly like manual items afterwards. There is no schema change: the CS-21 constraints, triggers and RLS govern the insert path. Unit conversion, pantry-aware subtraction, fortnight ranges and AI proposals remain out of scope.
