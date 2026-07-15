begin;

alter table cooksmith.profiles
  add column onboarding_step smallint not null default 1,
  add column onboarding_completed_at timestamptz,
  add constraint profiles_onboarding_step_range check (onboarding_step between 1 and 5),
  add constraint profiles_onboarding_completion_state check (
    onboarding_completed_at is null or onboarding_step = 5
  );

create schema if not exists cooksmith_private;
revoke all on schema cooksmith_private from public, anon, authenticated;

create function cooksmith_private.bootstrap_household(p_household_name text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  existing_household_id uuid;
  created_household_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_household_name is null
    or char_length(btrim(p_household_name)) not between 1 and 100 then
    raise exception 'Household name must contain between 1 and 100 characters.'
      using errcode = '22023';
  end if;

  perform 1 from auth.users where id = caller_id for update;

  if not exists (select 1 from cooksmith.profiles where id = caller_id) then
    raise exception 'Complete your profile before creating a household.'
      using errcode = '23514';
  end if;

  select member.household_id
  into existing_household_id
  from cooksmith.household_members as member
  where member.user_id = caller_id
    and member.status = 'active'
  order by member.joined_at, member.id
  limit 1;

  if existing_household_id is not null then
    update cooksmith.profiles
    set onboarding_step = greatest(onboarding_step, 3)
    where id = caller_id;
    return existing_household_id;
  end if;

  insert into cooksmith.households (name, created_by, updated_by)
  values (btrim(p_household_name), caller_id, caller_id)
  returning id into created_household_id;

  insert into cooksmith.household_members (
    household_id, user_id, role, status, created_by, updated_by
  ) values (
    created_household_id, caller_id, 'owner', 'active', caller_id, caller_id
  );

  insert into cooksmith.household_settings (household_id, created_by, updated_by)
  values (created_household_id, caller_id, caller_id);

  update cooksmith.profiles
  set onboarding_step = greatest(onboarding_step, 3)
  where id = caller_id;

  return created_household_id;
end;
$$;

create function cooksmith.bootstrap_household(p_household_name text)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select cooksmith_private.bootstrap_household(p_household_name);
$$;

comment on function cooksmith.bootstrap_household(text) is
  'Idempotently creates the authenticated user''s first household, owner membership and settings.';
comment on function cooksmith_private.bootstrap_household(text) is
  'Privileged onboarding implementation. Derives identity from auth.uid and serialises per user.';

revoke all on function cooksmith_private.bootstrap_household(text)
from public, anon, authenticated;
revoke all on function cooksmith.bootstrap_household(text) from public, anon, authenticated;
grant usage on schema cooksmith_private to authenticated;
grant execute on function cooksmith_private.bootstrap_household(text) to authenticated;
grant execute on function cooksmith.bootstrap_household(text) to authenticated;

commit;
