begin;

alter type cooksmith.pantry_item_category add value if not exists 'produce';
alter type cooksmith.pantry_item_category add value if not exists 'dairy';
alter type cooksmith.pantry_item_category add value if not exists 'meat_and_seafood';
alter type cooksmith.pantry_item_category add value if not exists 'bakery';
alter type cooksmith.pantry_item_category add value if not exists 'frozen';
alter type cooksmith.pantry_item_category add value if not exists 'household';
alter type cooksmith.pantry_item_category add value if not exists 'uncategorised';

alter type cooksmith.pantry_storage_location add value if not exists 'produce_storage';
alter type cooksmith.pantry_storage_location add value if not exists 'household_supplies';
alter type cooksmith.pantry_storage_location add value if not exists 'other';

create type cooksmith.pantry_classification_source as enum ('automatic', 'explicit');

alter table cooksmith.household_pantry_items
  add column category_source cooksmith.pantry_classification_source not null default 'explicit',
  add column storage_location_source cooksmith.pantry_classification_source not null default 'explicit',
  add column classification_version integer,
  add constraint household_pantry_items_classification_version_positive
    check (classification_version is null or classification_version > 0);

comment on column cooksmith.household_pantry_items.category_source is
  'Whether the current category is a Cooksmith suggestion or an explicit household correction.';
comment on column cooksmith.household_pantry_items.storage_location_source is
  'Whether the current location is a Cooksmith suggestion or an explicit household correction.';
comment on column cooksmith.household_pantry_items.classification_version is
  'Deterministic Pantry classification rule version last applied; null for pre-classification or fully explicit records.';

commit;
