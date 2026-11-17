begin;

-- CS-113 independent admission restriction only. No legacy rows are rewritten,
-- and no household provenance, read scope or update authority is inferred.
alter table cooksmith.imported_recipes alter column visibility set default 'private';

drop policy imported_recipes_insert_owned on cooksmith.imported_recipes;
create policy imported_recipes_insert_owned on cooksmith.imported_recipes
for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (visibility = 'private' or cooksmith.has_application_role('admin'))
);

commit;
