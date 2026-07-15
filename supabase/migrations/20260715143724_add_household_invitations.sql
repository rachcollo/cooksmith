begin;

create extension if not exists pgcrypto with schema extensions;

create type cooksmith.invitation_status as enum ('pending', 'accepted', 'cancelled', 'expired');

create table cooksmith.household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households (id) on delete cascade,
  email text not null,
  normalised_email text generated always as (lower(btrim(email))) stored,
  token_hash text not null,
  status cooksmith.invitation_status not null default 'pending',
  invited_by uuid not null references auth.users (id) on delete restrict,
  accepted_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_invitations_email_length
    check (char_length(btrim(email)) between 3 and 254),
  constraint household_invitations_email_format
    check (btrim(email) ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint household_invitations_token_hash_unique unique (token_hash),
  constraint household_invitations_expiry_after_creation check (expires_at > created_at),
  constraint household_invitations_lifecycle check (
    (status = 'pending' and accepted_at is null and accepted_by is null and cancelled_at is null)
    or (status = 'accepted' and accepted_at is not null and accepted_by is not null and cancelled_at is null)
    or (status = 'cancelled' and accepted_at is null and accepted_by is null and cancelled_at is not null)
    or (status = 'expired' and accepted_at is null and accepted_by is null and cancelled_at is null)
  )
);

create unique index household_invitations_pending_email_unique
  on cooksmith.household_invitations (household_id, normalised_email)
  where status = 'pending';
create index household_invitations_household_status_idx
  on cooksmith.household_invitations (household_id, status, expires_at);
create index household_invitations_invited_by_idx
  on cooksmith.household_invitations (invited_by);
create unique index household_members_one_active_household_per_user
  on cooksmith.household_members (user_id)
  where status = 'active';

create trigger household_invitations_set_updated_at
before update on cooksmith.household_invitations
for each row execute function cooksmith.set_updated_at();

create function cooksmith_private.protect_household_membership()
returns trigger
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  remaining_owner_count integer;
begin
  if tg_op = 'UPDATE' and (
    new.id <> old.id
    or new.user_id <> old.user_id
  ) then
    raise exception 'Membership identifiers cannot be changed.' using errcode = '23514';
  end if;

  if old.role = 'owner'
    and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.status <> 'active'
    ) then
    perform 1 from cooksmith.households where id = old.household_id for update;
    select count(*) into remaining_owner_count
    from cooksmith.household_members
    where household_id = old.household_id
      and role = 'owner'
      and status = 'active'
      and id <> old.id;
    if remaining_owner_count = 0 then
      raise exception 'The final household owner cannot be removed.' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger household_members_protect_identity_and_final_owner
before update or delete on cooksmith.household_members
for each row execute function cooksmith_private.protect_household_membership();

create function cooksmith_private.create_household_invitation(
  p_household_id uuid,
  p_email text
)
returns table (
  invitation_id uuid,
  invitation_token text,
  invited_email text,
  invitation_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalised_invited_email text := lower(btrim(p_email));
  generated_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not (select cooksmith.has_household_role(p_household_id, 'owner')) then
    raise exception 'Only a household owner can invite members.' using errcode = '42501';
  end if;
  if p_email is null
    or char_length(btrim(p_email)) not between 3 and 254
    or btrim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;

  perform 1 from cooksmith.households where id = p_household_id for update;

  update cooksmith.household_invitations
  set status = 'expired'
  where household_id = p_household_id
    and normalised_email = normalised_invited_email
    and status = 'pending'
    and expires_at <= statement_timestamp();

  if exists (
    select 1
    from cooksmith.household_invitations
    where household_id = p_household_id
      and normalised_email = normalised_invited_email
      and status = 'pending'
  ) then
    raise exception 'An active invitation already exists for this email.' using errcode = '23505';
  end if;

  if exists (
    select 1
    from cooksmith.household_members as member
    join auth.users as invited_user on invited_user.id = member.user_id
    where member.household_id = p_household_id
      and member.status = 'active'
      and lower(invited_user.email) = normalised_invited_email
  ) then
    raise exception 'This person is already a household member.' using errcode = '23505';
  end if;

  return query
  insert into cooksmith.household_invitations (
    household_id, email, token_hash, invited_by, expires_at
  ) values (
    p_household_id,
    btrim(p_email),
    encode(extensions.digest(generated_token, 'sha256'), 'hex'),
    caller_id,
    statement_timestamp() + interval '7 days'
  )
  returning id, generated_token, email, expires_at;
end;
$$;

create function cooksmith_private.resend_household_invitation(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  invitation_token text,
  invited_email text,
  invitation_expires_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  invitation cooksmith.household_invitations%rowtype;
  generated_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select * into invitation
  from cooksmith.household_invitations
  where id = p_invitation_id
  for update;
  if invitation.id is null then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if not (select cooksmith.has_household_role(invitation.household_id, 'owner')) then
    raise exception 'Only a household owner can resend invitations.' using errcode = '42501';
  end if;
  if invitation.status in ('accepted', 'cancelled') then
    raise exception 'This invitation can no longer be resent.' using errcode = '22023';
  end if;

  return query
  update cooksmith.household_invitations
  set token_hash = encode(extensions.digest(generated_token, 'sha256'), 'hex'),
      status = 'pending',
      expires_at = statement_timestamp() + interval '7 days',
      accepted_by = null,
      accepted_at = null,
      cancelled_at = null,
      invited_by = caller_id
  where id = p_invitation_id
  returning id, generated_token, email, expires_at;
end;
$$;

create function cooksmith_private.cancel_household_invitation(p_invitation_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  invitation cooksmith.household_invitations%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select * into invitation
  from cooksmith.household_invitations
  where id = p_invitation_id
  for update;
  if invitation.id is null then
    raise exception 'Invitation not found.' using errcode = 'P0002';
  end if;
  if not (select cooksmith.has_household_role(invitation.household_id, 'owner')) then
    raise exception 'Only a household owner can cancel invitations.' using errcode = '42501';
  end if;
  if invitation.status not in ('pending', 'expired') then
    raise exception 'This invitation can no longer be cancelled.' using errcode = '22023';
  end if;
  update cooksmith.household_invitations
  set status = 'cancelled', cancelled_at = statement_timestamp()
  where id = p_invitation_id;
end;
$$;

create function cooksmith_private.accept_household_invitation(
  p_invitation_token text,
  p_display_name text
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_email text;
  invitation cooksmith.household_invitations%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_invitation_token is null or char_length(p_invitation_token) <> 64 then
    raise exception 'This invitation link is invalid.' using errcode = '22023';
  end if;
  if p_display_name is null or char_length(btrim(p_display_name)) not between 1 and 100 then
    raise exception 'Enter a display name between 1 and 100 characters.' using errcode = '22023';
  end if;

  select lower(email) into caller_email from auth.users where id = caller_id;
  if caller_email is null then
    raise exception 'A verified email account is required.' using errcode = '42501';
  end if;

  select * into invitation
  from cooksmith.household_invitations
  where token_hash = encode(extensions.digest(p_invitation_token, 'sha256'), 'hex')
  for update;
  if invitation.id is null then
    raise exception 'This invitation link is invalid.' using errcode = '22023';
  end if;
  if invitation.status <> 'pending' then
    raise exception 'This invitation is no longer active.' using errcode = '22023';
  end if;
  if invitation.expires_at <= statement_timestamp() then
    update cooksmith.household_invitations set status = 'expired' where id = invitation.id;
    raise exception 'This invitation has expired.' using errcode = '22023';
  end if;
  if caller_email <> invitation.normalised_email then
    raise exception 'Sign in with the email address that received this invitation.'
      using errcode = '42501';
  end if;
  if exists (
    select 1 from cooksmith.household_members
    where user_id = caller_id and status = 'active'
  ) then
    raise exception 'Your account already belongs to a household.' using errcode = '23505';
  end if;

  insert into cooksmith.profiles (
    id, display_name, onboarding_step, onboarding_completed_at
  ) values (
    caller_id, btrim(p_display_name), 5, statement_timestamp()
  )
  on conflict (id) do update
  set display_name = excluded.display_name,
      onboarding_step = 5,
      onboarding_completed_at = excluded.onboarding_completed_at;

  insert into cooksmith.household_members (
    household_id, user_id, role, status, joined_at, inactive_at, created_by, updated_by
  ) values (
    invitation.household_id, caller_id, 'member', 'active', statement_timestamp(), null,
    invitation.invited_by, invitation.invited_by
  )
  on conflict (household_id, user_id) do update
  set role = 'member',
      status = 'active',
      joined_at = statement_timestamp(),
      inactive_at = null,
      updated_by = invitation.invited_by;

  update cooksmith.household_invitations
  set status = 'accepted', accepted_by = caller_id, accepted_at = statement_timestamp()
  where id = invitation.id;

  return invitation.household_id;
end;
$$;

create function cooksmith_private.remove_household_member(p_member_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  member cooksmith.household_members%rowtype;
  active_owner_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  select * into member
  from cooksmith.household_members
  where id = p_member_id
  for update;
  if member.id is null then
    raise exception 'Household member not found.' using errcode = 'P0002';
  end if;
  if not (select cooksmith.has_household_role(member.household_id, 'owner')) then
    raise exception 'Only a household owner can remove members.' using errcode = '42501';
  end if;
  if member.status <> 'active' then
    raise exception 'This household member is already inactive.' using errcode = '22023';
  end if;

  perform 1 from cooksmith.households where id = member.household_id for update;
  if member.role = 'owner' then
    select count(*) into active_owner_count
    from cooksmith.household_members
    where household_id = member.household_id
      and role = 'owner'
      and status = 'active';
    if active_owner_count <= 1 then
      raise exception 'The final household owner cannot be removed.' using errcode = '23514';
    end if;
  end if;

  update cooksmith.household_members
  set status = 'inactive', inactive_at = statement_timestamp(), updated_by = caller_id
  where id = member.id;
end;
$$;

create function cooksmith_private.list_household_members(p_household_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  member_role cooksmith.household_role,
  member_status cooksmith.membership_status,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if not (select cooksmith.is_active_household_member(p_household_id)) then
    raise exception 'Active household membership is required.' using errcode = '42501';
  end if;
  return query
  select member.id, member.user_id, profile.display_name, member.role, member.status,
    member.joined_at
  from cooksmith.household_members as member
  join cooksmith.profiles as profile on profile.id = member.user_id
  where member.household_id = p_household_id
    and member.status = 'active'
  order by member.role desc, lower(profile.display_name), member.joined_at;
end;
$$;

create function cooksmith.create_household_invitation(p_household_id uuid, p_email text)
returns table (
  invitation_id uuid,
  invitation_token text,
  invited_email text,
  invitation_expires_at timestamptz
)
language sql volatile security invoker set search_path = ''
as $$ select * from cooksmith_private.create_household_invitation(p_household_id, p_email); $$;

create function cooksmith.resend_household_invitation(p_invitation_id uuid)
returns table (
  invitation_id uuid,
  invitation_token text,
  invited_email text,
  invitation_expires_at timestamptz
)
language sql volatile security invoker set search_path = ''
as $$ select * from cooksmith_private.resend_household_invitation(p_invitation_id); $$;

create function cooksmith.cancel_household_invitation(p_invitation_id uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select cooksmith_private.cancel_household_invitation(p_invitation_id); $$;

create function cooksmith.accept_household_invitation(
  p_invitation_token text,
  p_display_name text
)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select cooksmith_private.accept_household_invitation(p_invitation_token, p_display_name); $$;

create function cooksmith.remove_household_member(p_member_id uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select cooksmith_private.remove_household_member(p_member_id); $$;

create function cooksmith.list_household_members(p_household_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  member_role cooksmith.household_role,
  member_status cooksmith.membership_status,
  joined_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$ select * from cooksmith_private.list_household_members(p_household_id); $$;

comment on table cooksmith.household_invitations is
  'Single-household member invitations. Tokens are stored only as SHA-256 hashes.';
comment on function cooksmith.accept_household_invitation(text, text) is
  'Accepts an active invitation for the authenticated user''s verified email.';

alter table cooksmith.household_invitations enable row level security;
revoke all on cooksmith.household_invitations from public, anon, authenticated;
grant select on cooksmith.household_invitations to authenticated;

create policy household_invitations_select_owner
on cooksmith.household_invitations
for select
to authenticated
using ((select cooksmith.has_household_role(household_id, 'owner')));

revoke all on function cooksmith_private.create_household_invitation(uuid, text)
from public, anon, authenticated;
revoke all on function cooksmith_private.protect_household_membership()
from public, anon, authenticated;
revoke all on function cooksmith_private.resend_household_invitation(uuid)
from public, anon, authenticated;
revoke all on function cooksmith_private.cancel_household_invitation(uuid)
from public, anon, authenticated;
revoke all on function cooksmith_private.accept_household_invitation(text, text)
from public, anon, authenticated;
revoke all on function cooksmith_private.remove_household_member(uuid)
from public, anon, authenticated;
revoke all on function cooksmith_private.list_household_members(uuid)
from public, anon, authenticated;
revoke all on function cooksmith.create_household_invitation(uuid, text)
from public, anon, authenticated;
revoke all on function cooksmith.resend_household_invitation(uuid)
from public, anon, authenticated;
revoke all on function cooksmith.cancel_household_invitation(uuid)
from public, anon, authenticated;
revoke all on function cooksmith.accept_household_invitation(text, text)
from public, anon, authenticated;
revoke all on function cooksmith.remove_household_member(uuid)
from public, anon, authenticated;
revoke all on function cooksmith.list_household_members(uuid)
from public, anon, authenticated;

grant execute on function cooksmith_private.create_household_invitation(uuid, text)
to authenticated;
grant execute on function cooksmith_private.resend_household_invitation(uuid)
to authenticated;
grant execute on function cooksmith_private.cancel_household_invitation(uuid)
to authenticated;
grant execute on function cooksmith_private.accept_household_invitation(text, text)
to authenticated;
grant execute on function cooksmith_private.remove_household_member(uuid)
to authenticated;
grant execute on function cooksmith_private.list_household_members(uuid)
to authenticated;
grant execute on function cooksmith.create_household_invitation(uuid, text)
to authenticated;
grant execute on function cooksmith.resend_household_invitation(uuid)
to authenticated;
grant execute on function cooksmith.cancel_household_invitation(uuid)
to authenticated;
grant execute on function cooksmith.accept_household_invitation(text, text)
to authenticated;
grant execute on function cooksmith.remove_household_member(uuid)
to authenticated;
grant execute on function cooksmith.list_household_members(uuid)
to authenticated;

commit;
