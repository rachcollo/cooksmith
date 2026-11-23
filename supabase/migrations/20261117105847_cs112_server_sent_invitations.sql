begin;

-- Remove token-bearing APIs. Existing pending hashes and emailed links remain valid.
drop function cooksmith.create_household_invitation(uuid, text);
drop function cooksmith.resend_household_invitation(uuid);
drop function cooksmith_private.create_household_invitation(uuid, text);
drop function cooksmith_private.resend_household_invitation(uuid);

revoke select on cooksmith.household_invitations from authenticated;
grant select (id, household_id, email, status, expires_at, created_at) on cooksmith.household_invitations to authenticated;

create table cooksmith.household_invitation_send_attempts (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references cooksmith.household_invitations(id) on delete cascade,
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  recipient_hash text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'reserved',
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint household_invitation_send_attempts_status check (status in ('reserved', 'sending', 'sent', 'failed')),
  constraint household_invitation_send_attempts_hash check (recipient_hash ~ '^[a-f0-9]{64}$')
);
create index household_invitation_send_attempts_household_idx on cooksmith.household_invitation_send_attempts(household_id, created_at);
create index household_invitation_send_attempts_recipient_idx on cooksmith.household_invitation_send_attempts(recipient_hash, created_at);
create index household_invitation_send_attempts_invitation_idx on cooksmith.household_invitation_send_attempts(invitation_id);
create index household_invitation_send_attempts_actor_idx on cooksmith.household_invitation_send_attempts(created_by);
create trigger household_invitation_send_attempts_updated_at before update on cooksmith.household_invitation_send_attempts
for each row execute function cooksmith.set_updated_at();
alter table cooksmith.household_invitation_send_attempts enable row level security;
revoke all on cooksmith.household_invitation_send_attempts from public, anon, authenticated;
-- No client policies: reservations and delivery outcomes are available only through constrained functions.

create function cooksmith_private.reserve_household_invitation(p_household_id uuid, p_email text, p_invitation_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  target_household uuid := p_household_id;
  recipient text := lower(btrim(p_email));
  recipient_digest text;
  invitation cooksmith.household_invitations%rowtype;
  attempt_id uuid;
begin
  if caller_id is null or not exists (select 1 from auth.users where id = caller_id and not is_anonymous and email_confirmed_at is not null) then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if p_invitation_id is not null then
    select * into invitation from cooksmith.household_invitations where id = p_invitation_id;
    target_household := invitation.household_id;
    recipient := invitation.normalised_email;
  end if;
  if target_household is null or not (select cooksmith.has_household_role(target_household, 'owner')) then
    raise exception 'Only a household owner can invite members.' using errcode = '42501';
  end if;
  if recipient is null or char_length(recipient) not between 3 and 254 or recipient !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  -- Serialise across households as well as within one household. Counts include failed sends.
  recipient_digest := encode(extensions.digest(recipient, 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('invitation:' || recipient_digest, 0));
  perform 1 from cooksmith.households where id = target_household for update;
  if not (select cooksmith.has_household_role(target_household, 'owner')) then
    raise exception 'Only a household owner can invite members.' using errcode = '42501';
  end if;
  if (select count(*) from cooksmith.household_invitation_send_attempts where household_id = target_household and created_at > statement_timestamp() - interval '1 hour') >= 20
    or (select count(*) from cooksmith.household_invitation_send_attempts where household_id = target_household and created_at > statement_timestamp() - interval '1 day') >= 50
    or exists (select 1 from cooksmith.household_invitation_send_attempts where recipient_hash = recipient_digest and created_at > statement_timestamp() - interval '1 minute')
    or (select count(*) from cooksmith.household_invitation_send_attempts where recipient_hash = recipient_digest and created_at > statement_timestamp() - interval '1 hour') >= 3
    or (select count(*) from cooksmith.household_invitation_send_attempts where recipient_hash = recipient_digest and created_at > statement_timestamp() - interval '1 day') >= 5 then
    raise exception 'Invitation rate limit reached.' using errcode = 'P0001';
  end if;
  if p_invitation_id is not null then
    select * into invitation from cooksmith.household_invitations where id = p_invitation_id for update;
    if invitation.status not in ('pending', 'expired') then
      raise exception 'This invitation is no longer active.' using errcode = '22023';
    end if;
  else
    select * into invitation from cooksmith.household_invitations
    where household_id = target_household and normalised_email = recipient and status = 'pending' for update;
  end if;
  if exists (select 1 from cooksmith.household_members m join auth.users u on u.id = m.user_id
    where m.household_id = target_household and m.status = 'active' and lower(u.email) = recipient) then
    raise exception 'This person is already a household member.' using errcode = '23505';
  end if;
  if invitation.id is null then
    insert into cooksmith.household_invitations(household_id, email, token_hash, invited_by, expires_at)
    values (target_household, recipient, encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex'), caller_id, statement_timestamp() + interval '7 days')
    returning * into invitation;
  end if;
  insert into cooksmith.household_invitation_send_attempts(invitation_id, household_id, recipient_hash, created_by)
    values (invitation.id, target_household, recipient_digest, caller_id) returning id into attempt_id;
  return attempt_id;
end;
$$;

create function cooksmith.create_household_invitation(p_household_id uuid, p_email text)
returns uuid language sql volatile security invoker set search_path = '' as $$
  select cooksmith_private.reserve_household_invitation(p_household_id, p_email);
$$;
create function cooksmith.resend_household_invitation(p_invitation_id uuid)
returns uuid language sql volatile security invoker set search_path = '' as $$
  select cooksmith_private.reserve_household_invitation(null, null, p_invitation_id);
$$;

-- Service-only claim. Identity comes from the JWT-authorised reservation, never an argument.
create function cooksmith_private.claim_household_invitation_delivery(p_attempt_id uuid, p_token_hash text)
returns table(email text, inviter_name text, household_name text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  attempt cooksmith.household_invitation_send_attempts%rowtype;
  invitation cooksmith.household_invitations%rowtype;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid hash.' using errcode = '22023'; end if;
  select * into attempt from cooksmith.household_invitation_send_attempts where id = p_attempt_id for update;
  if attempt.id is null or attempt.status <> 'reserved' or attempt.created_at <= statement_timestamp() - interval '1 minute' then
    raise exception 'Delivery unavailable.' using errcode = '22023';
  end if;
  if not exists (select 1 from cooksmith.household_members where household_id = attempt.household_id and user_id = attempt.created_by and role = 'owner' and status = 'active') then
    raise exception 'Owner access required.' using errcode = '42501';
  end if;
  select * into invitation from cooksmith.household_invitations where id = attempt.invitation_id for update;
  if invitation.status not in ('pending', 'expired') or invitation.household_id <> attempt.household_id then
    raise exception 'Delivery unavailable.' using errcode = '22023';
  end if;
  update cooksmith.household_invitations set token_hash = p_token_hash, status = 'pending',
    expires_at = statement_timestamp() + interval '7 days', invited_by = attempt.created_by where id = invitation.id;
  update cooksmith.household_invitation_send_attempts set status = 'sending' where id = attempt.id;
  return query select invitation.email, p.display_name, h.name
    from cooksmith.profiles p join cooksmith.households h on h.id = attempt.household_id where p.id = attempt.created_by;
end;
$$;
create function cooksmith.claim_household_invitation_delivery(p_attempt_id uuid, p_token_hash text)
returns table(email text, inviter_name text, household_name text)
language sql volatile security invoker set search_path = '' as $$
  select * from cooksmith_private.claim_household_invitation_delivery(p_attempt_id, p_token_hash);
$$;
create function cooksmith_private.finish_household_invitation_delivery(p_attempt_id uuid, p_sent boolean)
returns void language sql volatile security definer set search_path = '' as $$
  update cooksmith.household_invitation_send_attempts set status = case when p_sent then 'sent' else 'failed' end
  where id = p_attempt_id and status = 'sending';
$$;
create function cooksmith.finish_household_invitation_delivery(p_attempt_id uuid, p_sent boolean)
returns void language sql volatile security invoker set search_path = '' as $$
  select cooksmith_private.finish_household_invitation_delivery(p_attempt_id, p_sent);
$$;

revoke all on function cooksmith_private.reserve_household_invitation(uuid,text,uuid) from public, anon, authenticated;
revoke all on function cooksmith.create_household_invitation(uuid,text) from public, anon, authenticated;
revoke all on function cooksmith.resend_household_invitation(uuid) from public, anon, authenticated;
grant execute on function cooksmith_private.reserve_household_invitation(uuid,text,uuid), cooksmith.create_household_invitation(uuid,text), cooksmith.resend_household_invitation(uuid) to authenticated;
revoke all on function cooksmith_private.claim_household_invitation_delivery(uuid,text), cooksmith.claim_household_invitation_delivery(uuid,text), cooksmith_private.finish_household_invitation_delivery(uuid,boolean), cooksmith.finish_household_invitation_delivery(uuid,boolean) from public, anon, authenticated;
grant usage on schema cooksmith_private to service_role;
grant execute on function cooksmith_private.claim_household_invitation_delivery(uuid,text), cooksmith.claim_household_invitation_delivery(uuid,text), cooksmith_private.finish_household_invitation_delivery(uuid,boolean), cooksmith.finish_household_invitation_delivery(uuid,boolean) to service_role;

create or replace function cooksmith_private.accept_household_invitation(
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

  select lower(email) into caller_email from auth.users where id = caller_id and email_confirmed_at is not null and not is_anonymous;
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

commit;
