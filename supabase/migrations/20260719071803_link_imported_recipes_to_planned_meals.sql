begin;

alter table cooksmith.planned_meals
  add column imported_recipe_id uuid;

alter table cooksmith.planned_meals
  add constraint planned_meals_imported_recipe_id_fkey
  foreign key (imported_recipe_id)
  references cooksmith.imported_recipes (id)
  on delete set null,
  add constraint planned_meals_single_recipe_link
  check (num_nonnulls(recipe_id, imported_recipe_id) <= 1);

create index planned_meals_imported_recipe_id_idx
  on cooksmith.planned_meals (imported_recipe_id)
  where imported_recipe_id is not null;

create or replace function cooksmith_private.ensure_planned_meal_recipe_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_recipe_household_id uuid;
  imported_recipe_visibility cooksmith.imported_recipe_visibility;
  imported_recipe_owner_id uuid;
begin
  if new.recipe_id is not null then
    select household_id
      into linked_recipe_household_id
    from cooksmith.household_recipes
    where id = new.recipe_id;

    if linked_recipe_household_id is null or linked_recipe_household_id <> new.household_id then
      raise exception 'Recipe link must belong to the planned meal household.' using errcode = '23514';
    end if;
  end if;

  if new.imported_recipe_id is not null then
    select visibility, owner_id
      into imported_recipe_visibility, imported_recipe_owner_id
    from cooksmith.imported_recipes
    where id = new.imported_recipe_id;

    if imported_recipe_visibility is null
      or (imported_recipe_visibility = 'private' and imported_recipe_owner_id <> (select auth.uid())) then
      raise exception 'Imported recipe link must be visible to the current user.' using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger planned_meals_enforce_recipe_household on cooksmith.planned_meals;
create trigger planned_meals_enforce_recipe_household
before insert or update of household_id, recipe_id, imported_recipe_id on cooksmith.planned_meals
for each row execute function cooksmith_private.ensure_planned_meal_recipe_household();

comment on column cooksmith.planned_meals.imported_recipe_id is
  'Optional link to a visible public or caller-owned private recipe-bank item.';
comment on constraint planned_meals_single_recipe_link on cooksmith.planned_meals is
  'A planned meal can reference one household recipe or one imported recipe, never both.';
comment on function cooksmith_private.ensure_planned_meal_recipe_household() is
  'Enforces household ownership for household recipe links and caller visibility for imported recipe links.';

commit;
