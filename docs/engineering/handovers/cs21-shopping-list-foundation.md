# CS-21 Shopping List Foundation — Handover

## Reviewer outcome

Verify that a signed-in household member can open Shopping, add an item, edit its amount/category, mark it done, restore it and remove it. Refresh after each mutation to confirm persistence.

## Preview checklist

- Test at desktop and a narrow mobile viewport with no horizontal overflow.
- Add `Apples`, quantity `6`, category `Fruit and vegetables`.
- Edit it to `Pink Lady apples`, mark it done, refresh, then mark it needed again.
- Confirm duplicate names show a friendly error.
- Confirm keyboard focus and accessible control names for edit, remove and completion.
- With a second synthetic household, confirm its items are not visible or mutable.

## Database release

Migration `20260718173000_create_shopping_list_foundation.sql` must pass the protected database gate. Merging the application does not authorise a Production database migration; follow the existing production database release workflow separately.

## Rollback

Before database release, revert the feature commit. After a shared migration, retain the schema and use an additive forward fix while reverting the UI if required.
