begin;

-- Metric teaspoons are 5 mL. Regional tablespoons and cups remain explicit.
create function cooksmith.purchase_unit_v2(value text)
returns text language sql immutable security invoker set search_path='' as $$
  select case cooksmith.canonical_ingredient_unit_v1(regexp_replace(btrim(value),'[.]$','')) when 'tsp' then 'ml' else cooksmith.canonical_ingredient_unit_v1(regexp_replace(btrim(value),'[.]$','')) end;
$$;
create function cooksmith.purchase_unit_multiplier_v2(value text)
returns numeric language sql immutable security invoker set search_path='' as $$
  select case when cooksmith.canonical_ingredient_unit_v1(regexp_replace(btrim(value),'[.]$',''))='tsp' then 5::numeric else cooksmith.ingredient_unit_multiplier_v1(regexp_replace(btrim(value),'[.]$','')) end;
$$;
revoke all on function cooksmith.purchase_unit_v2(text),cooksmith.purchase_unit_multiplier_v2(text) from public,anon;
grant execute on function cooksmith.purchase_unit_v2(text),cooksmith.purchase_unit_multiplier_v2(text) to authenticated,service_role;

-- Purchase rows may span several contribution/unit records. Preserve all original
-- contributions when a household adjusts the combined purchase amount.
alter table cooksmith.shopping_list_items add column plan_override boolean not null default false;
update cooksmith.shopping_list_items i set plan_override=true where manual and exists(select 1 from cooksmith.shopping_item_contributions c where c.shopping_item_id=i.id);
drop index cooksmith.shopping_manual_name_unique;
create unique index shopping_manual_name_unique on cooksmith.shopping_list_items(household_id,normalised_name) where manual and not plan_override;

create function cooksmith.set_shopping_purchase_completed(target_household_id uuid, item_ids uuid[], target_completed boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select cooksmith.is_active_household_member(target_household_id)) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
  if coalesce(cardinality(item_ids),0)=0 or cardinality(item_ids)>500 or target_completed is null then raise exception 'Invalid purchase items.' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
  if (select count(*) from cooksmith.shopping_list_items where household_id=target_household_id and id=any(item_ids))<>cardinality(item_ids) then raise exception 'Purchase items changed. Refresh the list.' using errcode='42501'; end if;
  update cooksmith.shopping_list_items set completed=target_completed where household_id=target_household_id and id=any(item_ids);
end;
$$;

create function cooksmith.remove_shopping_purchase(target_household_id uuid, item_ids uuid[])
returns void language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select cooksmith.is_active_household_member(target_household_id)) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
  if coalesce(cardinality(item_ids),0)=0 or cardinality(item_ids)>500 then raise exception 'Invalid purchase items.' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
  if (select count(*) from cooksmith.shopping_list_items where household_id=target_household_id and id=any(item_ids))<>cardinality(item_ids) then raise exception 'Purchase items changed. Refresh the list.' using errcode='42501'; end if;
  delete from cooksmith.shopping_list_items where household_id=target_household_id and id=any(item_ids);
end;
$$;

create function cooksmith.update_shopping_purchase(target_household_id uuid, item_inputs jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare ids uuid[]; input jsonb;
begin
  if (select auth.uid()) is null or not (select cooksmith.is_active_household_member(target_household_id)) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
  if item_inputs is null or jsonb_typeof(item_inputs)<>'array' or jsonb_array_length(item_inputs) not between 1 and 500 then raise exception 'Invalid purchase items.' using errcode='23514'; end if;
  select array_agg((value->>'id')::uuid) into ids from jsonb_array_elements(item_inputs);
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
  if (select count(*) from cooksmith.shopping_list_items where household_id=target_household_id and id=any(ids))<>cardinality(ids) then raise exception 'Purchase items changed. Refresh the list.' using errcode='42501'; end if;
  for input in select value from jsonb_array_elements(item_inputs) loop
    update cooksmith.shopping_list_items set
      plan_override=plan_override or not manual or cardinality(ids)>1,
      manual=true,display_name=input->>'name',quantity=(input->>'quantity')::numeric,
      unit=nullif(input->>'unit',''),category=(input->>'category')::cooksmith.shopping_item_category
    where household_id=target_household_id and id=(input->>'id')::uuid;
  end loop;
end;
$$;

revoke all on function cooksmith.set_shopping_purchase_completed(uuid,uuid[],boolean),cooksmith.remove_shopping_purchase(uuid,uuid[]),cooksmith.update_shopping_purchase(uuid,jsonb) from public,anon;
grant execute on function cooksmith.set_shopping_purchase_completed(uuid,uuid[],boolean),cooksmith.remove_shopping_purchase(uuid,uuid[]),cooksmith.update_shopping_purchase(uuid,jsonb) to authenticated;

create or replace function cooksmith.reconcile_planned_meal_shopping(target_household_id uuid, target_planned_meal_id uuid, ingredient_inputs jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ingredient record;
  current_item_id uuid;
  previous_groups jsonb;
  previous_group record;
  previous_quantity numeric;
  previous_unit text;
  overridden boolean;
  retained_ids uuid[] := '{}'::uuid[];
begin
  if (select auth.uid()) is null or not (select cooksmith.is_active_household_member(target_household_id))
    or not exists(select 1 from cooksmith.planned_meals where id=target_planned_meal_id and household_id=target_household_id) then
    raise exception 'Active membership and a meal in this household are required.' using errcode='42501';
  end if;
  if ingredient_inputs is null or jsonb_typeof(ingredient_inputs)<>'array' or jsonb_array_length(ingredient_inputs)>500 then
    raise exception 'Invalid ingredient inputs.' using errcode='23514';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
  select coalesce(jsonb_agg(to_jsonb(purchase)), '[]'::jsonb) into previous_groups from (
    select ingredient_identity name,cooksmith.purchase_unit_v2(unit) unit,bool_and(completed) completed,
      case when count(quantity)=count(*) then sum(quantity*cooksmith.purchase_unit_multiplier_v2(unit)) else null end quantity
    from cooksmith.shopping_list_items where household_id=target_household_id and not manual
    group by ingredient_identity,cooksmith.purchase_unit_v2(unit)
  ) purchase;
  for ingredient in
    with inputs as (
      select cooksmith.canonical_ingredient_name_v1(value->>'name') name,
        cooksmith.purchase_unit_v2(value->>'unit') unit,
        nullif(value->>'quantity','')::numeric * cooksmith.purchase_unit_multiplier_v2(value->>'unit') quantity,
        value->>'category' category,
        case when jsonb_typeof(value->'sourceQuantities')='array' then value->'sourceQuantities'
          else jsonb_build_array(jsonb_build_object('name',value->>'name','quantity',value->'quantity','unit',value->>'unit')) end sources
      from jsonb_array_elements(ingredient_inputs)
    )
    select name,unit,case when count(quantity)=count(*) then sum(quantity) else null end quantity,min(category) category,
      (select coalesce(jsonb_agg(source.value),'[]'::jsonb) from inputs raw cross join lateral jsonb_array_elements(raw.sources) source where raw.name=i.name and raw.unit=i.unit) sources
    from inputs i group by name,unit
  loop
    -- An explicit purchase adjustment keeps its source links; refreshing a recipe
    -- must not add the same planned ingredient a second time beside the override.
    select i.id into current_item_id from cooksmith.shopping_list_items i
    join cooksmith.shopping_item_contributions c on c.shopping_item_id=i.id
    where i.household_id=target_household_id and i.plan_override and c.planned_meal_id=target_planned_meal_id
      and exists(select 1 from jsonb_array_elements(c.source_quantities) source
        where coalesce(source->>'purchaseName',cooksmith.canonical_ingredient_name_v1(source->>'name'))=ingredient.name
          and cooksmith.purchase_unit_v2(source->>'unit')=ingredient.unit)
    order by i.created_at,i.id limit 1;
    overridden:=current_item_id is not null;
    if not overridden then
    insert into cooksmith.shopping_list_items(household_id,display_name,quantity,unit,category,manual)
    values(target_household_id,ingredient.name,null,nullif(ingredient.unit,''),ingredient.category::cooksmith.shopping_item_category,false)
    on conflict(household_id,ingredient_identity,unit_identity) where not manual do update set display_name=excluded.display_name
    returning id into current_item_id;
    end if;
    select quantity,unit into previous_quantity,previous_unit from cooksmith.shopping_list_items where id=current_item_id;
    retained_ids := array_append(retained_ids,current_item_id);
    insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities)
    values(target_household_id,current_item_id,target_planned_meal_id,ingredient.quantity,nullif(ingredient.unit,''),ingredient.sources)
    on conflict(planned_meal_id,shopping_item_id) do update set quantity=excluded.quantity,unit=excluded.unit,source_quantities=excluded.source_quantities;
    if not overridden and exists(select 1 from cooksmith.shopping_list_items where id=current_item_id and (quantity is distinct from previous_quantity or unit is distinct from previous_unit)) then
      update cooksmith.shopping_list_items set completed=false where id=current_item_id;
    end if;
  end loop;
  -- Delete only obsolete contributions, after stable rows have been upserted. Bought state survives.
  delete from cooksmith.shopping_item_contributions where household_id=target_household_id and planned_meal_id=target_planned_meal_id and not(shopping_item_id=any(retained_ids));
  -- A legacy tsp row may be replaced by its equivalent mL row. Preserve bought
  -- state only when every previous member was bought and the exact total agrees.
  for previous_group in select * from jsonb_to_recordset(previous_groups) as p(name text,unit text,completed boolean,quantity numeric) loop
    if previous_group.completed and previous_group.quantity is not null and previous_group.quantity=(
      select case when count(quantity)=count(*) then sum(quantity*cooksmith.purchase_unit_multiplier_v2(unit)) else null end
      from cooksmith.shopping_list_items where household_id=target_household_id and not manual
        and ingredient_identity=previous_group.name and cooksmith.purchase_unit_v2(unit)=previous_group.unit
    ) then
      update cooksmith.shopping_list_items set completed=true where household_id=target_household_id and not manual
        and ingredient_identity=previous_group.name and cooksmith.purchase_unit_v2(unit)=previous_group.unit;
    end if;
  end loop;
end;
$$;

comment on column cooksmith.shopping_list_items.plan_override is 'An explicit household purchase adjustment retaining original planned-meal provenance.';
commit;
