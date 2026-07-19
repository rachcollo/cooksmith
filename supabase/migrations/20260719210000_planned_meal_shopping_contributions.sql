begin;

create table cooksmith.shopping_item_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  shopping_item_id uuid not null references cooksmith.shopping_list_items (id) on delete cascade,
  planned_meal_id uuid not null references cooksmith.planned_meals (id) on delete cascade,
  quantity numeric(10, 2),
  unit text,
  created_at timestamptz not null default now(),
  constraint shopping_item_contributions_quantity_non_negative
    check (quantity is null or quantity >= 0),
  constraint shopping_item_contributions_unit_length
    check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint shopping_item_contributions_meal_item_unique
    unique (planned_meal_id, shopping_item_id)
);

create index shopping_item_contributions_household_idx
  on cooksmith.shopping_item_contributions (household_id);
create index shopping_item_contributions_item_idx
  on cooksmith.shopping_item_contributions (shopping_item_id);
create index shopping_item_contributions_meal_idx
  on cooksmith.shopping_item_contributions (planned_meal_id);

alter table cooksmith.shopping_item_contributions enable row level security;
grant select, insert, update, delete on cooksmith.shopping_item_contributions to authenticated;

create policy shopping_contributions_select_active_member
on cooksmith.shopping_item_contributions
for select to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_contributions_insert_active_member
on cooksmith.shopping_item_contributions
for insert to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_contributions_update_active_member
on cooksmith.shopping_item_contributions
for update to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_contributions_delete_active_member
on cooksmith.shopping_item_contributions
for delete to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create function cooksmith_private.refresh_generated_shopping_item()
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
        when quantified_count = contribution_count and distinct_units = 1
          then nullif(shared_unit, '')
        else null
      end
    where id = affected_item_id and manual = false;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger shopping_contributions_refresh_item
after insert or update or delete on cooksmith.shopping_item_contributions
for each row execute function cooksmith_private.refresh_generated_shopping_item();

create function cooksmith.reconcile_planned_meal_shopping(
  target_household_id uuid,
  target_planned_meal_id uuid,
  ingredient_inputs jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  input jsonb;
  current_item_id uuid;
  current_item_manual boolean;
  current_meal_household_id uuid;
begin
  if (select auth.uid()) is null
    or not (select cooksmith.is_active_household_member(target_household_id)) then
    raise exception 'Active household membership is required.' using errcode = '42501';
  end if;

  select meal.household_id
    into current_meal_household_id
  from cooksmith.planned_meals as meal
  where meal.id = target_planned_meal_id;

  if current_meal_household_id is null
    or current_meal_household_id <> target_household_id then
    raise exception 'Planned meal must belong to the active household.' using errcode = '42501';
  end if;

  delete from cooksmith.shopping_item_contributions
  where planned_meal_id = target_planned_meal_id
    and household_id = target_household_id;

  for input in select value from jsonb_array_elements(coalesce(ingredient_inputs, '[]'::jsonb))
  loop
    current_item_id := null;
    current_item_manual := null;

    select item.id, item.manual
      into current_item_id, current_item_manual
    from cooksmith.shopping_list_items as item
    where item.household_id = target_household_id
      and item.normalised_name = lower(btrim(input ->> 'name'))
    limit 1;

    if current_item_id is null then
      insert into cooksmith.shopping_list_items (
        household_id,
        display_name,
        quantity,
        unit,
        category,
        manual
      )
      values (
        target_household_id,
        input ->> 'name',
        null,
        null,
        (input ->> 'category')::cooksmith.shopping_item_category,
        false
      )
      returning id into current_item_id;
    elsif current_item_manual then
      continue;
    end if;

    insert into cooksmith.shopping_item_contributions (
      household_id,
      shopping_item_id,
      planned_meal_id,
      quantity,
      unit
    )
    values (
      target_household_id,
      current_item_id,
      target_planned_meal_id,
      nullif(input ->> 'quantity', '')::numeric,
      nullif(btrim(input ->> 'unit'), '')
    )
    on conflict (planned_meal_id, shopping_item_id)
    do update set
      quantity = excluded.quantity,
      unit = excluded.unit;
  end loop;
end;
$$;

grant execute on function cooksmith.reconcile_planned_meal_shopping(uuid, uuid, jsonb)
  to authenticated;
revoke all on function cooksmith.reconcile_planned_meal_shopping(uuid, uuid, jsonb)
  from public, anon;
revoke all on function cooksmith_private.refresh_generated_shopping_item()
  from public, anon, authenticated;

comment on table cooksmith.shopping_item_contributions is
  'Per-planned-meal ingredient contributions used to reconcile generated shopping quantities.';
comment on function cooksmith.reconcile_planned_meal_shopping(uuid, uuid, jsonb) is
  'Replaces one planned meal contribution set and preserves contributions from other meals.';

commit;
