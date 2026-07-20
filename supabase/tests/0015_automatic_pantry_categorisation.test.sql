begin;
select plan(8);

select has_type('cooksmith', 'pantry_classification_source', 'classification provenance enum exists');
select col_not_null('cooksmith', 'household_pantry_items', 'category_source', 'category provenance is required');
select col_not_null('cooksmith', 'household_pantry_items', 'storage_location_source', 'location provenance is required');
select col_is_null('cooksmith', 'household_pantry_items', 'classification_version', 'rule version is optional for explicit and legacy values');

select results_eq(
  $$select distinct category_source::text from cooksmith.household_pantry_items order by 1$$,
  array['explicit'],
  'existing Pantry values are protected as explicit corrections'
);

select lives_ok(
  $$insert into cooksmith.household_pantry_items (
      household_id, name, category, category_source, storage_location,
      storage_location_source, classification_version
    ) values (
      '20000000-0000-4000-8000-000000000001', 'Synthetic classified milk', 'dairy',
      'automatic', 'fridge', 'automatic', 1
    )$$,
  'an authorised classification result fits the persisted contract'
);

select throws_ok(
  $$update cooksmith.household_pantry_items
    set classification_version = 0
    where name = 'Synthetic classified milk'$$,
  '23514',
  null,
  'non-positive classification versions are rejected'
);

select results_eq(
  $$select category::text || '/' || storage_location::text
    from cooksmith.household_pantry_items
    where name = 'Synthetic classified milk'$$,
  array['dairy/fridge'],
  'new Pantry enum values round trip'
);

select * from finish();
rollback;
