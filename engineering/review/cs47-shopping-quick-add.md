# Engineering Package — CS-47: Refine Mobile Shopping List Entry

**Status:** In Review

**Branch:** `agent/cs-47-shopping-quick-add`

**Base:** `main` at `eaebb4e36bf8e765942146142bff41aeefa36a49`

**Jira:** CS-47

## Objective

Make the household shopping list faster to use on a phone by removing low-value introductory space and limiting quick add to item name and optional quantity.

## Approved behaviour

- Show only Item name and Quantity in the add-item form.
- Persist hidden unit and category values through the existing safe defaults (`null` and `other`).
- Keep the full edit form so a user can still correct existing item details.
- Compact the Shopping header, summary and add panel on narrow mobile viewports.
- Preserve add, edit, complete, restore, remove, duplicate prevention and household sharing behaviour.

## Acceptance criteria

- [x] Mobile quick add exposes exactly two fields.
- [x] Hidden fields receive valid existing defaults without a database change.
- [x] The mobile heading and form use materially less vertical space.
- [x] Touch targets, labels and keyboard operation remain accessible.
- [x] Integration coverage proves the simplified submission contract.
- [ ] Hosted Preview is verified at a narrow mobile viewport and desktop.

## Out of scope

Automatic food and kitchen storage-location categorisation is tracked separately in Jira CS-48.

## Release impact

- Migrations: none.
- Edge Functions: none.
- Dependencies: none.
- Cost: A$0/month and A$0/year.

## Rollback

Revert the UI commit. The database contract and stored shopping data are unchanged.
