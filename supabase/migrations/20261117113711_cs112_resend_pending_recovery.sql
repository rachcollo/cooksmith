begin;

-- Forward fix: preserve the published CS-112 migration and existing pending links.
create or replace function cooksmith_private.reserve_household_invitation(p_household_id uuid, p_email text, p_invitation_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := (select auth.uid());
  target_household uuid := p_household_id;
  recipient text := lower(btrim(p_email));
  recipient_digest text;
  invitation cooksmith.household_invitations%rowtype;
  attempt_id uuid;
  current_pending cooksmith.household_invitations%rowtype;
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
    -- Legacy create could leave an expired predecessor alongside a pending replacement.
    -- Authorise the requested row first, then reuse its household's current pending row.
    if invitation.status = 'expired' then
      select * into current_pending from cooksmith.household_invitations
      where household_id = target_household and normalised_email = recipient and status = 'pending'
      for update;
      if found then invitation := current_pending; end if;
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

commit;
