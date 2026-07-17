begin;

create type cooksmith.meal_type as enum ('breakfast', 'lunch', 'dinner');

create table cooksmith.planned_meals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  meal_date date not null,
  meal_type cooksmith.meal_type not null,
  title text not null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planned_meals_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint planned_meals_notes_length check (notes is null or char_length(btrim(notes)) between 1 and 500)
);

create index planned_meals_household_week_idx on cooksmith.planned_meals (household_id, meal_date, meal_type);
create index planned_meals_created_by_idx on cooksmith.planned_meals (created_by);
create index planned_meals_updated_by_idx on cooksmith.planned_meals (updated_by);

create function cooksmith_private.set_planned_meal_audit_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    new.created_by = caller_id;
  end if;
  new.updated_by = caller_id;
  return new;
end;
$$;

create trigger planned_meals_set_updated_at
before update on cooksmith.planned_meals
for each row execute function cooksmith.set_updated_at();

create trigger planned_meals_set_audit_fields
before insert or update on cooksmith.planned_meals
for each row execute function cooksmith_private.set_planned_meal_audit_fields();

comment on table cooksmith.planned_meals is
  'Private household-owned planned meals for the weekly meal planner.';

alter table cooksmith.planned_meals enable row level security;
grant select, insert, update, delete on cooksmith.planned_meals to authenticated;

create policy planned_meals_select_active_member
on cooksmith.planned_meals
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy planned_meals_insert_active_member
on cooksmith.planned_meals
for insert
to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy planned_meals_update_active_member
on cooksmith.planned_meals
for update
to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));

create policy planned_meals_delete_active_member
on cooksmith.planned_meals
for delete
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

revoke all on function cooksmith_private.set_planned_meal_audit_fields() from public, anon, authenticated;

commit;
