begin;

alter table cooksmith.household_recipes
  add column if not exists notes text,
  add column if not exists category text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists favourite boolean not null default false,
  add constraint household_recipes_notes_length check (notes is null or char_length(btrim(notes)) <= 4000),
  add constraint household_recipes_category_length check (category is null or char_length(btrim(category)) <= 80),
  add constraint household_recipes_tags_count check (cardinality(tags) <= 12);

create table cooksmith.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references cooksmith.household_recipes(id) on delete cascade,
  ingredient_name text not null,
  quantity_text text,
  unit text,
  preparation text,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_ingredients_name_length check (char_length(btrim(ingredient_name)) between 1 and 160),
  constraint recipe_ingredients_quantity_length check (quantity_text is null or char_length(btrim(quantity_text)) <= 24),
  constraint recipe_ingredients_quantity_format check (quantity_text is null or quantity_text ~ '^\d+(\.\d+)?$|^\d+/\d+$|^\d+\s+\d+/\d+$'),
  constraint recipe_ingredients_unit_length check (unit is null or char_length(btrim(unit)) <= 40),
  constraint recipe_ingredients_preparation_length check (preparation is null or char_length(btrim(preparation)) <= 120),
  constraint recipe_ingredients_position_positive check (position > 0),
  constraint recipe_ingredients_recipe_position_unique unique (recipe_id, position)
);

create table cooksmith.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references cooksmith.household_recipes(id) on delete cascade,
  instruction text not null,
  position integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_steps_instruction_length check (char_length(btrim(instruction)) between 1 and 1200),
  constraint recipe_steps_position_positive check (position > 0),
  constraint recipe_steps_recipe_position_unique unique (recipe_id, position)
);

create index recipe_ingredients_recipe_id_idx on cooksmith.recipe_ingredients (recipe_id);
create index recipe_steps_recipe_id_idx on cooksmith.recipe_steps (recipe_id);

create trigger recipe_ingredients_set_updated_at
before update on cooksmith.recipe_ingredients
for each row execute function cooksmith_private.set_updated_at();

create trigger recipe_steps_set_updated_at
before update on cooksmith.recipe_steps
for each row execute function cooksmith_private.set_updated_at();

alter table cooksmith.recipe_ingredients enable row level security;
alter table cooksmith.recipe_steps enable row level security;

grant select, insert, update, delete on cooksmith.recipe_ingredients to authenticated;
grant select, insert, update, delete on cooksmith.recipe_steps to authenticated;

create policy recipe_ingredients_active_member_all
on cooksmith.recipe_ingredients
for all
to authenticated
using (exists (
  select 1 from cooksmith.household_recipes recipes
  where recipes.id = recipe_ingredients.recipe_id
    and cooksmith_private.is_active_household_member(recipes.household_id, auth.uid())
))
with check (exists (
  select 1 from cooksmith.household_recipes recipes
  where recipes.id = recipe_ingredients.recipe_id
    and cooksmith_private.is_active_household_member(recipes.household_id, auth.uid())
));

create policy recipe_steps_active_member_all
on cooksmith.recipe_steps
for all
to authenticated
using (exists (
  select 1 from cooksmith.household_recipes recipes
  where recipes.id = recipe_steps.recipe_id
    and cooksmith_private.is_active_household_member(recipes.household_id, auth.uid())
))
with check (exists (
  select 1 from cooksmith.household_recipes recipes
  where recipes.id = recipe_steps.recipe_id
    and cooksmith_private.is_active_household_member(recipes.household_id, auth.uid())
));

insert into cooksmith.recipe_ingredients (recipe_id, ingredient_name, position)
select id, ingredients, 1
from cooksmith.household_recipes
where ingredients is not null and btrim(ingredients) <> ''
on conflict do nothing;

insert into cooksmith.recipe_steps (recipe_id, instruction, position)
select id, description, 1
from cooksmith.household_recipes
where description is not null and btrim(description) <> ''
on conflict do nothing;

comment on table cooksmith.recipe_ingredients is 'Ordered structured ingredient rows for household recipe authoring.';
comment on table cooksmith.recipe_steps is 'Ordered structured instruction steps for household recipe authoring.';

commit;
