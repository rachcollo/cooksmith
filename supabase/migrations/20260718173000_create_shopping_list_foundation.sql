begin;

create type cooksmith.shopping_item_category as enum (
  'produce',
  'meat_and_seafood',
  'dairy_and_eggs',
  'bakery',
  'pantry',
  'frozen',
  'household',
  'other'
);

create table cooksmith.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  status text not null default 'active',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_lists_status_allowed check (status in ('active', 'archived')),
  constraint shopping_lists_version_positive check (version > 0),
  constraint shopping_lists_id_household_unique unique (id, household_id)
);

create unique index shopping_lists_one_active_per_household_idx
  on cooksmith.shopping_lists (household_id) where status = 'active';

create trigger shopping_lists_set_updated_at
before update on cooksmith.shopping_lists
for each row execute function cooksmith.set_updated_at();

insert into cooksmith.shopping_lists (household_id)
select household.id from cooksmith.households as household where household.status = 'active';

create table cooksmith.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  shopping_list_id uuid not null,
  display_name text not null,
  normalised_name text generated always as (lower(btrim(display_name))) stored,
  quantity numeric(10, 2),
  unit text,
  category cooksmith.shopping_item_category not null default 'other',
  completed boolean not null default false,
  manual boolean not null default true,
  position integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_list_items_name_length
    check (char_length(btrim(display_name)) between 1 and 100),
  constraint shopping_list_items_quantity_non_negative check (quantity is null or quantity >= 0),
  constraint shopping_list_items_unit_length
    check (unit is null or char_length(btrim(unit)) between 1 and 40),
  constraint shopping_list_items_position_non_negative check (position >= 0),
  constraint shopping_list_items_household_name_unique unique (household_id, normalised_name),
  constraint shopping_list_items_list_household_fkey
    foreign key (shopping_list_id, household_id)
    references cooksmith.shopping_lists (id, household_id) on delete cascade
);

create index shopping_list_items_household_state_position_idx
  on cooksmith.shopping_list_items (household_id, completed, position, normalised_name);
create index shopping_list_items_created_by_idx on cooksmith.shopping_list_items (created_by);
create index shopping_list_items_updated_by_idx on cooksmith.shopping_list_items (updated_by);
create index shopping_list_items_list_id_idx on cooksmith.shopping_list_items (shopping_list_id);

create function cooksmith_private.create_current_shopping_list(target_household_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_list_id uuid;
begin
  insert into cooksmith.shopping_lists (household_id)
  values (target_household_id)
  on conflict (household_id) where status = 'active' do update
    set household_id = excluded.household_id
  returning id into current_list_id;
  return current_list_id;
end;
$$;

create function cooksmith_private.create_current_shopping_list_after_household()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform cooksmith_private.create_current_shopping_list(new.id);
  return new;
end;
$$;

create trigger households_create_current_shopping_list
after insert on cooksmith.households
for each row execute function cooksmith_private.create_current_shopping_list_after_household();

create function cooksmith_private.set_shopping_item_audit_fields()
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
    new.shopping_list_id = cooksmith_private.create_current_shopping_list(new.household_id);
    select coalesce(max(item.position), -1) + 1
      into new.position
      from cooksmith.shopping_list_items as item
      where item.household_id = new.household_id;
  end if;
  new.updated_by = caller_id;
  return new;
end;
$$;

create trigger shopping_list_items_set_updated_at
before update on cooksmith.shopping_list_items
for each row execute function cooksmith.set_updated_at();

create trigger shopping_list_items_set_audit_fields
before insert or update on cooksmith.shopping_list_items
for each row execute function cooksmith_private.set_shopping_item_audit_fields();

comment on table cooksmith.shopping_list_items is
  'Private household current-list items for CS-21 manual shopping-list foundation.';
comment on table cooksmith.shopping_lists is
  'Private household shopping-list containers; CS-21 maintains one active manual list.';

alter table cooksmith.shopping_lists enable row level security;
alter table cooksmith.shopping_list_items enable row level security;
grant select on cooksmith.shopping_lists to authenticated;
grant select, insert, update, delete on cooksmith.shopping_list_items to authenticated;

create policy shopping_lists_select_active_member
on cooksmith.shopping_lists
for select to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_items_select_active_member
on cooksmith.shopping_list_items
for select to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_items_insert_active_member
on cooksmith.shopping_list_items
for insert to authenticated
with check ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_items_update_active_member
on cooksmith.shopping_list_items
for update to authenticated
using ((select cooksmith.is_active_household_member(household_id)))
with check ((select cooksmith.is_active_household_member(household_id)));

create policy shopping_items_delete_active_member
on cooksmith.shopping_list_items
for delete to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

revoke all on function cooksmith_private.set_shopping_item_audit_fields()
  from public, anon, authenticated;
revoke all on function cooksmith_private.create_current_shopping_list(uuid)
  from public, anon, authenticated;
revoke all on function cooksmith_private.create_current_shopping_list_after_household()
  from public, anon, authenticated;

commit;
