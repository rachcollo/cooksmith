begin;

alter table cooksmith.planned_meals
  add column recipe_id uuid;

alter table cooksmith.planned_meals
  add constraint planned_meals_recipe_id_fkey
  foreign key (recipe_id)
  references cooksmith.household_recipes (id)
  on delete set null;

create index planned_meals_recipe_id_idx on cooksmith.planned_meals (recipe_id) where recipe_id is not null;

create function cooksmith_private.ensure_planned_meal_recipe_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_recipe_household_id uuid;
begin
  if new.recipe_id is null then
    return new;
  end if;

  select household_id
    into linked_recipe_household_id
  from cooksmith.household_recipes
  where id = new.recipe_id;

  if linked_recipe_household_id is null or linked_recipe_household_id <> new.household_id then
    raise exception 'Recipe link must belong to the planned meal household.' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger planned_meals_enforce_recipe_household
before insert or update of household_id, recipe_id on cooksmith.planned_meals
for each row execute function cooksmith_private.ensure_planned_meal_recipe_household();

comment on column cooksmith.planned_meals.recipe_id is
  'Optional same-household recipe link. The planned meal title remains the historical snapshot; recipe deletion sets this link to null and never deletes planned meals.';
comment on function cooksmith_private.ensure_planned_meal_recipe_household() is
  'Enforces that optional planned-meal recipe links cannot cross household boundaries.';

revoke all on function cooksmith_private.ensure_planned_meal_recipe_household() from public, anon, authenticated;

commit;
