begin;

-- v1 is immutable once released; future identity changes require a new version/migration.
create function cooksmith.canonical_ingredient_name_v1(value text)
returns text language plpgsql immutable strict security invoker set search_path = '' as $$
declare
  name text := btrim(regexp_replace(regexp_replace(lower(normalize(value, NFKC)), '[^[:alnum:][:space:]]+', ' ', 'g'), '\s+', ' ', 'g'));
  word text;
  words text[] := '{}'::text[];
begin
  if name ~ '[0-9]' then return name; end if;
  foreach word in array string_to_array(name, ' ') loop
    words := array_append(words, case word
      when 'onions' then 'onion' when 'carrots' then 'carrot' when 'potatoes' then 'potato'
      when 'tomatoes' then 'tomato' when 'capsicums' then 'capsicum' when 'zucchinis' then 'zucchini'
      when 'courgettes' then 'courgette' when 'chillies' then 'chilli' when 'chilis' then 'chilli'
      when 'peppers' then 'pepper' when 'powders' then 'powder' when 'cloves' then 'clove'
      when 'eggs' then 'egg' when 'lemons' then 'lemon' when 'limes' then 'lime' when 'apples' then 'apple'
      else word end);
  end loop;
  name := '';
  foreach word in array words loop
    name := name || case when name='' then '' else ' ' end || word;
  end loop;
  name := regexp_replace(name, '\mbell pepper\M', 'capsicum', 'g');
  name := regexp_replace(name, '\mcourgette\M', 'zucchini', 'g');
  name := regexp_replace(name, '\mcilantro\M', 'coriander', 'g');
  name := regexp_replace(name, '\myogurt\M', 'yoghurt', 'g');
  if name !~ '\m(frozen|canned|tinned|jar|jarred|pre|ready|packet|packaged|dried|powder|paste)\M'
    and name ~ '\m(onion|carrot|potato|capsicum|zucchini|celery|garlic|ginger|chilli)\M' then
    name := btrim(regexp_replace(regexp_replace(name, '\m(finely|roughly|thinly|thickly|diced|sliced|chopped|grated)\M', ' ', 'g'), '\s+', ' ', 'g'));
  end if;
  return name;
end;
$$;

create function cooksmith.canonical_ingredient_unit_v1(value text)
returns text language sql immutable security invoker set search_path = '' as $$
  select case lower(btrim(coalesce(value, '')))
    when '' then '' when 'each' then '' when 'whole' then '' when 'count' then ''
    when 'gram' then 'g' when 'grams' then 'g' when 'kg' then 'g' when 'kilogram' then 'g' when 'kilograms' then 'g'
    when 'millilitre' then 'ml' when 'millilitres' then 'ml' when 'milliliter' then 'ml' when 'milliliters' then 'ml'
    when 'l' then 'ml' when 'litre' then 'ml' when 'litres' then 'ml' when 'liter' then 'ml' when 'liters' then 'ml'
    when 'teaspoon' then 'tsp' when 'teaspoons' then 'tsp' when 'tablespoon' then 'tbsp' when 'tablespoons' then 'tbsp'
    when 'cups' then 'cup' when 'cloves' then 'clove' when 'cans' then 'can' when 'tins' then 'tin'
    else lower(btrim(value)) end;
$$;

create function cooksmith.ingredient_unit_multiplier_v1(value text)
returns numeric language sql immutable security invoker set search_path = '' as $$
  select case when lower(btrim(value)) in ('kg','kilogram','kilograms','l','litre','litres','liter','liters') then 1000::numeric else 1::numeric end;
$$;

revoke all on function cooksmith.canonical_ingredient_name_v1(text), cooksmith.canonical_ingredient_unit_v1(text), cooksmith.ingredient_unit_multiplier_v1(text) from public, anon;
grant execute on function cooksmith.canonical_ingredient_name_v1(text), cooksmith.canonical_ingredient_unit_v1(text), cooksmith.ingredient_unit_multiplier_v1(text) to authenticated, service_role;

alter table cooksmith.shopping_item_contributions add column source_quantities jsonb not null default '[]'::jsonb,
  add constraint shopping_contributions_source_array check (jsonb_typeof(source_quantities) = 'array');
alter table cooksmith.shopping_list_items drop constraint shopping_list_items_household_name_unique;
alter table cooksmith.shopping_list_items
  add column ingredient_identity text generated always as (cooksmith.canonical_ingredient_name_v1(display_name)) stored,
  add column unit_identity text generated always as (cooksmith.canonical_ingredient_unit_v1(unit)) stored,
  add column ingredient_identity_version integer not null default 1 check (ingredient_identity_version = 1);

-- Preserve raw source amounts before transforming only generated shopping rows. Pantry is untouched.
alter table cooksmith.shopping_item_contributions disable trigger shopping_contributions_refresh_item;
update cooksmith.shopping_item_contributions c
set source_quantities = jsonb_build_array(jsonb_build_object('name', i.display_name, 'quantity', c.quantity, 'unit', c.unit)),
    quantity = c.quantity * cooksmith.ingredient_unit_multiplier_v1(c.unit),
    unit = nullif(cooksmith.canonical_ingredient_unit_v1(c.unit), '')
from cooksmith.shopping_list_items i where i.id = c.shopping_item_id and not i.manual;

-- Rebuild generated rows from contributions, including legacy mixed-unit rows. The original
-- constraint allowed one name only, so a single old row may need to split into several units.
create temporary table ingredient_identity_backfill on commit drop as
select c.*, i.ingredient_identity, i.completed, i.position, i.category
from cooksmith.shopping_item_contributions c
join cooksmith.shopping_list_items i on i.id=c.shopping_item_id where not i.manual;
-- Preserve any orphan generated row as a manual item rather than discarding unexplained data.
update cooksmith.shopping_list_items i set manual=true
where not manual and not exists(select 1 from pg_temp.ingredient_identity_backfill b where b.shopping_item_id=i.id);
delete from cooksmith.shopping_list_items i where not manual;
do $$
declare grouping record; current_item_id uuid; contribution record;
begin
  for grouping in
    select household_id,ingredient_identity,coalesce(unit,'') unit,
      bool_and(completed) completed,min(position) position,min(category::text) category,
      case when count(quantity)=count(*) then sum(quantity) else null end quantity
    from pg_temp.ingredient_identity_backfill group by household_id,ingredient_identity,coalesce(unit,'')
  loop
    insert into cooksmith.shopping_list_items(household_id,display_name,quantity,unit,category,manual,completed,position)
    values(grouping.household_id,grouping.ingredient_identity,grouping.quantity,nullif(grouping.unit,''),grouping.category::cooksmith.shopping_item_category,false,grouping.completed,grouping.position)
    returning id into current_item_id;
    for contribution in
      select planned_meal_id,case when count(quantity)=count(*) then sum(quantity) else null end quantity,
        (select coalesce(jsonb_agg(source.value),'[]'::jsonb)
          from pg_temp.ingredient_identity_backfill original
          cross join lateral jsonb_array_elements(original.source_quantities) source
          where original.household_id=grouping.household_id and original.ingredient_identity=grouping.ingredient_identity
            and coalesce(original.unit,'')=grouping.unit and original.planned_meal_id=b.planned_meal_id) sources
      from pg_temp.ingredient_identity_backfill b
      where household_id=grouping.household_id and ingredient_identity=grouping.ingredient_identity and coalesce(unit,'')=grouping.unit
      group by planned_meal_id
    loop
      insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities)
      values(grouping.household_id,current_item_id,contribution.planned_meal_id,contribution.quantity,nullif(grouping.unit,''),contribution.sources);
    end loop;
  end loop;
end;
$$;
alter table cooksmith.shopping_item_contributions enable trigger shopping_contributions_refresh_item;

create unique index shopping_manual_name_unique on cooksmith.shopping_list_items(household_id,normalised_name) where manual;
create unique index shopping_generated_identity_unique on cooksmith.shopping_list_items(household_id,ingredient_identity,unit_identity) where not manual;

create or replace function cooksmith.reconcile_planned_meal_shopping(target_household_id uuid, target_planned_meal_id uuid, ingredient_inputs jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  ingredient record;
  current_item_id uuid;
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
  for ingredient in
    with inputs as (
      select cooksmith.canonical_ingredient_name_v1(value->>'name') name,
        cooksmith.canonical_ingredient_unit_v1(value->>'unit') unit,
        nullif(value->>'quantity','')::numeric * cooksmith.ingredient_unit_multiplier_v1(value->>'unit') quantity,
        value->>'category' category,
        case when jsonb_typeof(value->'sourceQuantities')='array' then value->'sourceQuantities'
          else jsonb_build_array(jsonb_build_object('name',value->>'name','quantity',value->'quantity','unit',value->>'unit')) end sources
      from jsonb_array_elements(ingredient_inputs)
    )
    select name,unit,case when count(quantity)=count(*) then sum(quantity) else null end quantity,min(category) category,
      (select coalesce(jsonb_agg(source.value),'[]'::jsonb) from inputs raw cross join lateral jsonb_array_elements(raw.sources) source where raw.name=i.name and raw.unit=i.unit) sources
    from inputs i group by name,unit
  loop
    insert into cooksmith.shopping_list_items(household_id,display_name,quantity,unit,category,manual)
    values(target_household_id,ingredient.name,null,nullif(ingredient.unit,''),ingredient.category::cooksmith.shopping_item_category,false)
    on conflict(household_id,ingredient_identity,unit_identity) where not manual do update set display_name=excluded.display_name
    returning id into current_item_id;
    retained_ids := array_append(retained_ids,current_item_id);
    insert into cooksmith.shopping_item_contributions(household_id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities)
    values(target_household_id,current_item_id,target_planned_meal_id,ingredient.quantity,nullif(ingredient.unit,''),ingredient.sources)
    on conflict(planned_meal_id,shopping_item_id) do update set quantity=excluded.quantity,unit=excluded.unit,source_quantities=excluded.source_quantities;
  end loop;
  -- Delete only obsolete contributions, after stable rows have been upserted. Bought state survives.
  delete from cooksmith.shopping_item_contributions where household_id=target_household_id and planned_meal_id=target_planned_meal_id and not(shopping_item_id=any(retained_ids));
end;
$$;

create or replace function cooksmith_private.refresh_generated_shopping_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  affected_item_id uuid := coalesce(new.shopping_item_id, old.shopping_item_id);
  contribution_count integer;
  quantified_count integer;
  distinct_units integer;
  total_quantity numeric(10, 2);
  shared_unit text;
  item_is_manual boolean;
begin
  select item.manual
    into item_is_manual
  from cooksmith.shopping_list_items as item
  where item.id = affected_item_id;

  if item_is_manual is null or item_is_manual then
    return coalesce(new, old);
  end if;

  select
    count(*),
    count(contribution.quantity),
    count(distinct lower(coalesce(contribution.unit, ''))),
    sum(contribution.quantity),
    min(contribution.unit)
  into
    contribution_count,
    quantified_count,
    distinct_units,
    total_quantity,
    shared_unit
  from cooksmith.shopping_item_contributions as contribution
  where contribution.shopping_item_id = affected_item_id;

  if contribution_count = 0 then
    delete from cooksmith.shopping_list_items
    where id = affected_item_id and manual = false;
  else
    update cooksmith.shopping_list_items
    set
      quantity = case
        when quantified_count = contribution_count and distinct_units = 1 then total_quantity
        else null
      end,
      unit = case
        when distinct_units = 1 then nullif(shared_unit, '')
        else null
      end
    where id = affected_item_id and manual = false;
  end if;

  return coalesce(new, old);
end;
$$;

-- Bind every contribution to its household at both foreign-key boundaries, including direct API writes.
alter table cooksmith.shopping_list_items add constraint shopping_items_id_household_unique unique(id,household_id);
alter table cooksmith.planned_meals add constraint planned_meals_id_household_unique unique(id,household_id);
alter table cooksmith.shopping_item_contributions
  drop constraint shopping_item_contributions_shopping_item_id_fkey,
  drop constraint shopping_item_contributions_planned_meal_id_fkey,
  add constraint shopping_contributions_item_household_fkey foreign key(shopping_item_id,household_id) references cooksmith.shopping_list_items(id,household_id) on delete cascade,
  add constraint shopping_contributions_meal_household_fkey foreign key(planned_meal_id,household_id) references cooksmith.planned_meals(id,household_id) on delete cascade;

-- Existing Pantry aliases are retained for user review. Prevent new collisions, including races.
create function cooksmith_private.check_pantry_ingredient_identity_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare identity text := cooksmith.canonical_ingredient_name_v1(new.name);
begin
  if tg_op='UPDATE' then
    if new.household_id=old.household_id and identity=cooksmith.canonical_ingredient_name_v1(old.name) then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.household_id::text || ':pantry:' || identity,0));
  -- Let the existing exact-name constraint handle ON CONFLICT in default population.
  if exists(select 1 from cooksmith.household_pantry_items where household_id=new.household_id and id<>new.id and normalised_name=lower(btrim(new.name))) then return new; end if;
  if exists(select 1 from cooksmith.household_pantry_items where household_id=new.household_id and id<>new.id and cooksmith.canonical_ingredient_name_v1(name)=identity) then
    raise exception 'That product already exists in this household pantry.' using errcode='23505';
  end if;
  return new;
end;
$$;
revoke all on function cooksmith_private.check_pantry_ingredient_identity_v1() from public,anon,authenticated;
create trigger pantry_ingredient_identity_v1 before insert or update of name,household_id on cooksmith.household_pantry_items
for each row execute function cooksmith_private.check_pantry_ingredient_identity_v1();
create index pantry_ingredient_identity_lookup on cooksmith.household_pantry_items(household_id,cooksmith.canonical_ingredient_name_v1(name));

comment on function cooksmith.canonical_ingredient_name_v1(text) is 'v1 purchasing identity; never used to group preparation tasks. Preserves material product qualifiers.';
comment on column cooksmith.shopping_item_contributions.source_quantities is 'Original recipe ingredient names and quantities, retained separately from canonical purchasing totals.';
commit;
