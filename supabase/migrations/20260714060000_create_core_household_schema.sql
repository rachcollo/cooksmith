begin;

create type cooksmith.household_status as enum ('active', 'archived');
create type cooksmith.household_role as enum ('owner', 'member');
create type cooksmith.membership_status as enum ('active', 'inactive');
create type cooksmith.application_role as enum ('admin', 'content_editor', 'support');
create type cooksmith.prep_mode as enum ('no_prep', 'quick', 'standard', 'batch');
create type cooksmith.budget_band as enum ('economy', 'standard', 'flexible');
create type cooksmith.cooking_skill as enum ('beginner', 'confident', 'experienced');
create type cooksmith.cooking_enjoyment as enum ('low', 'neutral', 'high');
create type cooksmith.constraint_strength as enum ('hard', 'soft');

create function cooksmith.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

comment on function cooksmith.set_updated_at() is
  'Maintains updated_at for mutable Cooksmith v2 rows.';

create table cooksmith.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  timezone text not null default 'Australia/Melbourne',
  locale text not null default 'en-AU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 100),
  constraint profiles_timezone_length check (char_length(btrim(timezone)) between 1 and 100),
  constraint profiles_locale_format check (locale ~ '^[a-z]{2}-[A-Z]{2}$')
);

create table cooksmith.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status cooksmith.household_status not null default 'active',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint households_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint households_archive_state check (
    (status = 'active' and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  )
);

create table cooksmith.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role cooksmith.household_role not null default 'member',
  status cooksmith.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  inactive_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_members_household_user_unique unique (household_id, user_id),
  constraint household_members_household_id_id_unique unique (household_id, id),
  constraint household_members_inactive_state check (
    (status = 'active' and inactive_at is null)
    or (status = 'inactive' and inactive_at is not null)
  )
);

create table cooksmith.app_user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role cooksmith.application_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_user_roles_pkey primary key (user_id, role),
  constraint app_user_roles_no_self_grant check (granted_by is null or granted_by <> user_id)
);

create table cooksmith.household_settings (
  household_id uuid primary key references cooksmith.households (id) on delete cascade,
  default_servings smallint not null default 4,
  weeknight_max_minutes smallint not null default 30,
  weekend_max_minutes smallint not null default 60,
  preferred_prep_day smallint,
  prep_mode cooksmith.prep_mode not null default 'quick',
  default_store text,
  budget_band cooksmith.budget_band not null default 'standard',
  cooking_skill cooksmith.cooking_skill not null default 'confident',
  cooking_enjoyment cooksmith.cooking_enjoyment not null default 'neutral',
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_settings_servings_range check (default_servings between 1 and 20),
  constraint household_settings_weeknight_minutes_range check (weeknight_max_minutes between 5 and 240),
  constraint household_settings_weekend_minutes_range check (weekend_max_minutes between 5 and 480),
  constraint household_settings_prep_day_range check (
    preferred_prep_day is null or preferred_prep_day between 0 and 6
  ),
  constraint household_settings_store_length check (
    default_store is null or char_length(btrim(default_store)) between 1 and 100
  )
);

create table cooksmith.household_dietary_requirements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  applies_to_member_id uuid,
  requirement text not null,
  normalised_requirement text generated always as (lower(btrim(requirement))) stored,
  strength cooksmith.constraint_strength not null default 'hard',
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_dietary_requirements_requirement_length check (
    char_length(btrim(requirement)) between 1 and 100
  ),
  constraint household_dietary_requirements_notes_length check (
    notes is null or char_length(notes) <= 500
  ),
  constraint household_dietary_requirements_member_scope_fk
    foreign key (household_id, applies_to_member_id)
    references cooksmith.household_members (household_id, id)
    on delete cascade,
  constraint household_dietary_requirements_scope_unique
    unique nulls not distinct (household_id, applies_to_member_id, normalised_requirement)
);

create table cooksmith.household_allergies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  applies_to_member_id uuid,
  allergen text not null,
  normalised_allergen text generated always as (lower(btrim(allergen))) stored,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_allergies_allergen_length check (
    char_length(btrim(allergen)) between 1 and 100
  ),
  constraint household_allergies_notes_length check (notes is null or char_length(notes) <= 500),
  constraint household_allergies_member_scope_fk
    foreign key (household_id, applies_to_member_id)
    references cooksmith.household_members (household_id, id)
    on delete cascade,
  constraint household_allergies_scope_unique
    unique nulls not distinct (household_id, applies_to_member_id, normalised_allergen)
);

create index households_status_idx on cooksmith.households (status);
create index households_created_by_idx on cooksmith.households (created_by);
create index households_updated_by_idx on cooksmith.households (updated_by);
create index household_members_user_status_idx
  on cooksmith.household_members (user_id, status);
create index household_members_household_status_idx
  on cooksmith.household_members (household_id, status);
create index household_members_created_by_idx on cooksmith.household_members (created_by);
create index household_members_updated_by_idx on cooksmith.household_members (updated_by);
create index app_user_roles_role_idx on cooksmith.app_user_roles (role);
create index app_user_roles_granted_by_idx on cooksmith.app_user_roles (granted_by);
create index household_settings_created_by_idx on cooksmith.household_settings (created_by);
create index household_settings_updated_by_idx on cooksmith.household_settings (updated_by);
create index household_dietary_requirements_household_idx
  on cooksmith.household_dietary_requirements (household_id);
create index household_dietary_requirements_member_idx
  on cooksmith.household_dietary_requirements (applies_to_member_id)
  where applies_to_member_id is not null;
create index household_dietary_requirements_created_by_idx
  on cooksmith.household_dietary_requirements (created_by);
create index household_dietary_requirements_updated_by_idx
  on cooksmith.household_dietary_requirements (updated_by);
create index household_allergies_household_idx on cooksmith.household_allergies (household_id);
create index household_allergies_member_idx
  on cooksmith.household_allergies (applies_to_member_id)
  where applies_to_member_id is not null;
create index household_allergies_created_by_idx on cooksmith.household_allergies (created_by);
create index household_allergies_updated_by_idx on cooksmith.household_allergies (updated_by);

create trigger profiles_set_updated_at
before update on cooksmith.profiles
for each row execute function cooksmith.set_updated_at();

create trigger households_set_updated_at
before update on cooksmith.households
for each row execute function cooksmith.set_updated_at();

create trigger household_members_set_updated_at
before update on cooksmith.household_members
for each row execute function cooksmith.set_updated_at();

create trigger app_user_roles_set_updated_at
before update on cooksmith.app_user_roles
for each row execute function cooksmith.set_updated_at();

create trigger household_settings_set_updated_at
before update on cooksmith.household_settings
for each row execute function cooksmith.set_updated_at();

create trigger household_dietary_requirements_set_updated_at
before update on cooksmith.household_dietary_requirements
for each row execute function cooksmith.set_updated_at();

create trigger household_allergies_set_updated_at
before update on cooksmith.household_allergies
for each row execute function cooksmith.set_updated_at();

comment on table cooksmith.profiles is 'Global user profile data independent of household membership.';
comment on table cooksmith.households is 'Private Cooksmith household tenant records.';
comment on table cooksmith.household_members is 'Many-to-many user membership of Cooksmith households.';
comment on table cooksmith.app_user_roles is 'Global application roles granted outside browser clients.';
comment on table cooksmith.household_settings is 'One planning and cooking preference record per household.';
comment on table cooksmith.household_dietary_requirements is
  'Explicit household or member dietary constraints. Private and excluded from analytics.';
comment on table cooksmith.household_allergies is
  'Explicit hard allergy constraints. Private and excluded from analytics.';

revoke all on all tables in schema cooksmith from public, anon, authenticated;
revoke all on all sequences in schema cooksmith from public, anon, authenticated;
revoke execute on function cooksmith.set_updated_at() from public, anon, authenticated;

commit;
