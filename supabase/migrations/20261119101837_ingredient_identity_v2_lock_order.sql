begin;
create temporary table cs116_lock_repair_contracts on commit drop as
select p.oid, pg_get_functiondef(p.oid) definition, p.proacl, p.prosecdef, p.proconfig,
 p.oid in (
  'cooksmith.save_pantry_item_v2(uuid,uuid,jsonb)'::regprocedure,
  'cooksmith_private.check_put_away_identity_v2(uuid,jsonb)'::regprocedure,
  'cooksmith.receive_measured_shopping_v2(uuid,uuid,jsonb)'::regprocedure,
  'cooksmith.put_shopping_away_v2(uuid,uuid,jsonb)'::regprocedure
 ) repaired
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('cooksmith','cooksmith_private');
-- Forward repair: the original shared expansion is immutable. Preserve all v1
-- definitions/ACLs and the signatures/security mode of the four v2 functions.
-- EXCLUSIVE conflicts with legacy SELECT FOR UPDATE's ROW SHARE table lock.
-- A legacy row owner therefore finishes its UPDATE before this lock is granted;
-- once granted, a new legacy row owner cannot enter ahead of the v2 row lock.
-- Ordinary reads remain allowed. This remains a global, cross-household lock:
-- callers must use short transactions; it is not a household writer fence.
create or replace function cooksmith.save_pantry_item_v2(p_household_id uuid default null,p_item_id uuid default null,p_input jsonb default '{}')
returns setof cooksmith.household_pantry_items language plpgsql security invoker set search_path='' as $$
declare household uuid:=p_household_id; old_item cooksmith.household_pantry_items; identity text;
begin
 if p_item_id is not null then
  select * into old_item from cooksmith.household_pantry_items where id=p_item_id;
  if not found then raise exception 'Pantry item is unavailable.' using errcode='42501'; end if;
  if household is not null and household<>old_item.household_id then raise exception 'Household mismatch.' using errcode='42501'; end if;
  household:=old_item.household_id;
 end if;
 if auth.uid() is null or not cooksmith.is_active_household_member(household) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 lock table cooksmith.household_pantry_items in exclusive mode;
 if p_item_id is not null then select * into old_item from cooksmith.household_pantry_items where id=p_item_id for update; end if;
 identity:=cooksmith.canonical_ingredient_name_v2(p_input->>'name');
 if identity is null or identity='' then raise exception 'Check the Pantry item name.' using errcode='23514'; end if;
 if (p_item_id is null or identity is distinct from cooksmith.canonical_ingredient_name_v2(old_item.name))
 and exists(select 1 from cooksmith.household_pantry_items where household_id=household and id is distinct from p_item_id and cooksmith.canonical_ingredient_name_v2(name)=identity) then
  raise exception 'That Pantry identity already exists.' using errcode='23505'; end if;
 if p_item_id is null then
  return query insert into cooksmith.household_pantry_items(household_id,name,category,category_source,storage_location,storage_location_source,classification_version,quantity,unit,available,quantity_untracked)
  values(household,p_input->>'name',(p_input->>'category')::cooksmith.pantry_item_category,(p_input->>'categorySource')::cooksmith.pantry_classification_source,(p_input->>'storageLocation')::cooksmith.pantry_storage_location,(p_input->>'storageLocationSource')::cooksmith.pantry_classification_source,(p_input->>'classificationVersion')::integer,(p_input->>'quantity')::numeric,p_input->>'unit',(p_input->>'available')::boolean,coalesce((p_input->>'quantityUntracked')::boolean,false)) returning *;
 else
  return query update cooksmith.household_pantry_items set name=p_input->>'name',category=(p_input->>'category')::cooksmith.pantry_item_category,category_source=(p_input->>'categorySource')::cooksmith.pantry_classification_source,storage_location=(p_input->>'storageLocation')::cooksmith.pantry_storage_location,storage_location_source=(p_input->>'storageLocationSource')::cooksmith.pantry_classification_source,classification_version=(p_input->>'classificationVersion')::integer,quantity=(p_input->>'quantity')::numeric,unit=p_input->>'unit',available=(p_input->>'available')::boolean,quantity_untracked=coalesce((p_input->>'quantityUntracked')::boolean,old_item.quantity_untracked) where id=p_item_id and household_id=household returning *;
 end if;
end; $$;
revoke all on function cooksmith.save_pantry_item_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith.save_pantry_item_v2(uuid,uuid,jsonb) to authenticated;

create or replace function cooksmith_private.check_put_away_identity_v2(household uuid,choices jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare choice jsonb; source jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(household) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 -- Shape checks are separate statements: never evaluate array length/elements
 -- on a scalar, and never acquire the advisory/table lock for invalid input.
 if jsonb_typeof(choices) is distinct from 'array' then
  raise exception 'Review the selected items.' using errcode='23514';
 end if;
 if jsonb_array_length(choices) not between 1 and 100 then
  raise exception 'Review the selected items.' using errcode='23514';
 end if;
 for choice in select value from jsonb_array_elements(choices) loop
  if jsonb_typeof(choice) is distinct from 'object'
   or jsonb_typeof(choice->'name') is distinct from 'string'
   or char_length(btrim(choice->>'name')) not between 1 and 100
   or cooksmith.canonical_ingredient_name_v2(choice->>'name')=''
   or jsonb_typeof(choice->'sources') is distinct from 'array' then
   raise exception 'Review the item name and selected purchases.' using errcode='23514';
  end if;
  if jsonb_array_length(choice->'sources')=0 then
   raise exception 'Review the item name and selected purchases.' using errcode='23514';
  end if;
  for source in select value from jsonb_array_elements(choice->'sources') loop
   if jsonb_typeof(source) is distinct from 'object'
    or jsonb_typeof(source->'key') is distinct from 'string'
    or btrim(source->>'key')='' then
    raise exception 'Invalid purchase source.' using errcode='23514';
   end if;
  end loop;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(household::text||':shopping',0));
 lock table cooksmith.household_pantry_items in exclusive mode;
 for choice in select value from jsonb_array_elements(choices) loop
  if not exists(select 1 from cooksmith.household_pantry_items where household_id=household and normalised_name=lower(btrim(choice->>'name')))
   and exists(select 1 from cooksmith.household_pantry_items where household_id=household and cooksmith.canonical_ingredient_name_v2(name)=cooksmith.canonical_ingredient_name_v2(choice->>'name')) then
   raise exception 'Pantry changed. Choose the exact Pantry item.' using errcode='PT409'; end if;
 end loop;
end; $$;
revoke all on function cooksmith_private.check_put_away_identity_v2(uuid,jsonb) from public,anon;
grant execute on function cooksmith_private.check_put_away_identity_v2(uuid,jsonb) to authenticated;
-- Let the unchanged v1 boundary reject a null operation before identity locking.
create or replace function cooksmith.receive_measured_shopping_v2(p_household_id uuid,p_operation_id uuid,p_choices jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if p_operation_id is not null and not exists(select 1 from cooksmith.shopping_put_away_batches where id=p_operation_id and household_id=p_household_id) then
  perform cooksmith_private.check_put_away_identity_v2(p_household_id,p_choices); end if;
 return cooksmith.receive_measured_shopping(p_household_id,p_operation_id,p_choices);
end; $$;
create or replace function cooksmith.put_shopping_away_v2(target_household_id uuid,operation_id uuid,reviewed_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if operation_id is not null and not exists(select 1 from cooksmith.shopping_put_away_batches where id=operation_id and household_id=target_household_id) then
  perform cooksmith_private.check_put_away_identity_v2(target_household_id,reviewed_items); end if;
 return cooksmith.put_shopping_away(target_household_id,operation_id,reviewed_items);
end; $$;
revoke all on function cooksmith.receive_measured_shopping_v2(uuid,uuid,jsonb),cooksmith.put_shopping_away_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith.receive_measured_shopping_v2(uuid,uuid,jsonb),cooksmith.put_shopping_away_v2(uuid,uuid,jsonb) to authenticated;
do $$ begin
 if exists (
  select 1 from cs116_lock_repair_contracts c left join pg_proc p on p.oid=c.oid
  where p.oid is null or c.proacl is distinct from p.proacl
   or c.prosecdef is distinct from p.prosecdef or c.proconfig is distinct from p.proconfig
   or (not c.repaired and c.definition is distinct from pg_get_functiondef(p.oid))
 ) then raise exception 'CS-116 lock repair changed an unrelated function or security contract'; end if;
end; $$;
commit;
