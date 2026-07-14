begin;

create function cooksmith.is_active_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from cooksmith.household_members as member
    where member.household_id = target_household_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
  );
$$;

create function cooksmith.has_household_role(
  target_household_id uuid,
  required_role cooksmith.household_role
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from cooksmith.household_members as member
    where member.household_id = target_household_id
      and member.user_id = (select auth.uid())
      and member.role = required_role
      and member.status = 'active'
  );
$$;

create function cooksmith.has_application_role(required_role cooksmith.application_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from cooksmith.app_user_roles as app_role
    where app_role.user_id = (select auth.uid())
      and app_role.role = required_role
  );
$$;

comment on function cooksmith.is_active_household_member(uuid) is
  'Returns whether the authenticated user has an active membership in the household.';
comment on function cooksmith.has_household_role(uuid, cooksmith.household_role) is
  'Returns whether the authenticated user has the required active household role.';
comment on function cooksmith.has_application_role(cooksmith.application_role) is
  'Returns whether the authenticated user has a separate global application role.';

revoke all on function cooksmith.is_active_household_member(uuid) from public, anon, authenticated;
revoke all on function cooksmith.has_household_role(uuid, cooksmith.household_role)
from public, anon, authenticated;
revoke all on function cooksmith.has_application_role(cooksmith.application_role)
from public, anon, authenticated;
grant execute on function cooksmith.is_active_household_member(uuid) to authenticated;
grant execute on function cooksmith.has_household_role(uuid, cooksmith.household_role) to authenticated;
grant execute on function cooksmith.has_application_role(cooksmith.application_role) to authenticated;

alter table cooksmith.infrastructure_health enable row level security;
alter table cooksmith.profiles enable row level security;
alter table cooksmith.households enable row level security;
alter table cooksmith.household_members enable row level security;
alter table cooksmith.app_user_roles enable row level security;
alter table cooksmith.household_settings enable row level security;
alter table cooksmith.household_dietary_requirements enable row level security;
alter table cooksmith.household_allergies enable row level security;

grant usage on schema cooksmith to authenticated;
grant select, insert, update on cooksmith.profiles to authenticated;
grant select, update on cooksmith.households to authenticated;
grant select, insert, update, delete on cooksmith.household_members to authenticated;
grant select, insert, update, delete on cooksmith.household_settings to authenticated;
grant select, insert, update, delete on cooksmith.household_dietary_requirements to authenticated;
grant select, insert, update, delete on cooksmith.household_allergies to authenticated;

create policy profiles_select_self
on cooksmith.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy profiles_insert_self
on cooksmith.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_update_self
on cooksmith.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy households_select_active_member
on cooksmith.households
for select
to authenticated
using ((select cooksmith.is_active_household_member(id)));

create policy households_update_owner
on cooksmith.households
for update
to authenticated
using ((select cooksmith.has_household_role(id, 'owner')))
with check ((select cooksmith.has_household_role(id, 'owner')));

create policy household_members_select_active_member
on cooksmith.household_members
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy household_members_insert_owner
on cooksmith.household_members
for insert
to authenticated
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy household_members_update_owner
on cooksmith.household_members
for update
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')))
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy household_members_delete_owner
on cooksmith.household_members
for delete
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')));

create policy household_settings_select_active_member
on cooksmith.household_settings
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy household_settings_insert_owner
on cooksmith.household_settings
for insert
to authenticated
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy household_settings_update_owner
on cooksmith.household_settings
for update
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')))
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy household_settings_delete_owner
on cooksmith.household_settings
for delete
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')));

create policy dietary_requirements_select_active_member
on cooksmith.household_dietary_requirements
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy dietary_requirements_insert_owner
on cooksmith.household_dietary_requirements
for insert
to authenticated
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy dietary_requirements_update_owner
on cooksmith.household_dietary_requirements
for update
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')))
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy dietary_requirements_delete_owner
on cooksmith.household_dietary_requirements
for delete
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')));

create policy allergies_select_active_member
on cooksmith.household_allergies
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy allergies_insert_owner
on cooksmith.household_allergies
for insert
to authenticated
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy allergies_update_owner
on cooksmith.household_allergies
for update
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')))
with check ((select cooksmith.has_household_role(household_id, 'owner')));

create policy allergies_delete_owner
on cooksmith.household_allergies
for delete
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')));

commit;
