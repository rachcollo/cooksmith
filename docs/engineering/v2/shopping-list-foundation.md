# Shopping list foundation

CS-21 introduces one active, household-private shopping list and a deliberately small manual-item workflow. The browser reads the current household's items and may add, edit, complete, restore or remove them. PostgreSQL remains authoritative for household ownership, validation and access.

`shopping_lists` provides the durable container and version boundary needed by later generated-list work. `shopping_list_items` stores display name, optional quantity and unit, grocery category, completion, provenance and ordering. New and existing active households receive one active list. CS-21 writes manual items only; CS-22 owns generation from the meal plan.

RLS grants list-container reads and item CRUD only to active household members. Audit triggers derive user identity from `auth.uid()`. The client never supplies or trusts an actor identity, and a private helper resolves the active list for an inserted item.

The UI groups needed items by grocery category and moves completed items to a separate section. Completion is reversible. Duplicate names are rejected case-insensitively within a household.

This foundation excludes ingredient aggregation, Pantry reconciliation, multiple lists, retailer export, reminders, scanning and AI.
