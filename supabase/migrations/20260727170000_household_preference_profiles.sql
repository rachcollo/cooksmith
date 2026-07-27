begin;

create table cooksmith.household_preference_profiles (
  household_id uuid primary key references cooksmith.households (id) on delete cascade,
  people jsonb not null default '[]'::jsonb,
  dietary_requirements text[] not null default '{}',
  favourite_cuisines text[] not null default '{}',
  liked_foods text[] not null default '{}',
  avoided_foods text[] not null default '{}',
  cooking_confidence text,
  weeknight_time text,
  preferred_store text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint household_preferences_people_array check (jsonb_typeof(people) = 'array'),
  constraint household_preferences_people_limit check (jsonb_array_length(people) <= 30),
  constraint household_preferences_confidence check (
    cooking_confidence is null or cooking_confidence in ('beginner', 'comfortable', 'confident')
  ),
  constraint household_preferences_time check (
    weeknight_time is null or weeknight_time in ('up_to_20', 'up_to_30', 'up_to_45', 'flexible')
  ),
  constraint household_preferences_store_length check (
    preferred_store is null or char_length(btrim(preferred_store)) <= 100
  )
);

create trigger household_preference_profiles_set_updated_at
before update on cooksmith.household_preference_profiles
for each row execute function cooksmith.set_updated_at();

create function cooksmith_private.set_household_preference_audit()
returns trigger language plpgsql security definer
set search_path = pg_catalog, cooksmith, cooksmith_private
as $$
begin
  if tg_op = 'INSERT' then new.created_by = (select auth.uid()); end if;
  new.updated_by = (select auth.uid());
  return new;
end;
$$;

create trigger household_preference_profiles_set_audit
before insert or update on cooksmith.household_preference_profiles
for each row execute function cooksmith_private.set_household_preference_audit();

alter table cooksmith.household_preference_profiles enable row level security;
grant select, insert, update, delete on cooksmith.household_preference_profiles to authenticated;

create policy household_preference_profiles_select_active_member
on cooksmith.household_preference_profiles for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy household_preference_profiles_insert_active_member
on cooksmith.household_preference_profiles for insert
to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy household_preference_profiles_update_active_member
on cooksmith.household_preference_profiles for update
to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));

create policy household_preference_profiles_delete_active_member
on cooksmith.household_preference_profiles for delete
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

comment on table cooksmith.household_preference_profiles is
  'Optional household-level recommendation profile. People cooked for are preference subjects only and never confer application access.';

commit;
