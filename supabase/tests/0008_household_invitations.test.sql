begin;

select plan(30);

select has_table('cooksmith', 'household_invitations', 'Invitation table exists');
select has_function(
  'cooksmith', 'create_household_invitation', array['uuid', 'text'],
  'Owner invitation RPC exists'
);
select has_function(
  'cooksmith', 'accept_household_invitation', array['text', 'text'],
  'Invitation acceptance RPC exists'
);
select ok(
  (select relrowsecurity from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'cooksmith'
      and pg_class.relname = 'household_invitations'),
  'Invitation table has RLS enabled'
);
select ok(
  not has_table_privilege('anon', 'cooksmith.household_invitations', 'select')
  and has_table_privilege('authenticated', 'cooksmith.household_invitations', 'select'),
  'Anonymous access is denied and authenticated access is policy gated'
);
select results_eq(
  $$select count(*)::integer
    from pg_catalog.pg_proc
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'cooksmith_private'
      and pg_proc.proname in (
        'create_household_invitation', 'resend_household_invitation',
        'cancel_household_invitation', 'accept_household_invitation',
        'remove_household_member', 'list_household_members'
      )
      and pg_proc.prosecdef
      and exists (
        select 1 from unnest(pg_proc.proconfig) as setting
        where setting like 'search_path=%'
          and replace(setting, 'search_path=', '') in ('', '""')
      )$$,
  array[6],
  'Every privileged invitation function has an empty search path'
);

insert into auth.users (
  instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'owner@test.invalid',
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'member@test.invalid',
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'unrelated@test.invalid',
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'invitee@test.invalid',
   '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '60000000-0000-4000-8000-000000000005',
   'authenticated', 'authenticated', 'other-owner@test.invalid',
   '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into cooksmith.profiles (id, display_name, onboarding_step, onboarding_completed_at)
values
  ('60000000-0000-4000-8000-000000000001', 'Owner', 5, now()),
  ('60000000-0000-4000-8000-000000000002', 'Member', 5, now()),
  ('60000000-0000-4000-8000-000000000003', 'Unrelated', 5, now()),
  ('60000000-0000-4000-8000-000000000005', 'Other owner', 5, now());

insert into cooksmith.households (id, name, created_by, updated_by)
values
  ('61000000-0000-4000-8000-000000000001', 'Invitation household',
   '60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000002', 'Other household',
   '60000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005');

insert into cooksmith.household_members (id, household_id, user_id, role, status)
values
  ('62000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
   '60000000-0000-4000-8000-000000000001', 'owner', 'active'),
  ('62000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001',
   '60000000-0000-4000-8000-000000000002', 'member', 'active'),
  ('62000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000002',
   '60000000-0000-4000-8000-000000000005', 'owner', 'active');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'new-person@test.invalid'
  )$$,
  'Owner can create an invitation'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_invitations
    where household_id = '61000000-0000-4000-8000-000000000001' and status = 'pending'$$,
  array[1],
  'Owner can list the household pending invitation'
);
select throws_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'NEW-PERSON@test.invalid'
  )$$,
  '23505', 'An active invitation already exists for this email.',
  'Normalised duplicate active invitations are rejected'
);
select throws_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'member@test.invalid'
  )$$,
  '23505', 'This person is already a household member.',
  'Existing active member cannot be reinvited'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'forbidden@test.invalid'
  )$$,
  '42501', 'Only a household owner can invite members.',
  'Household member cannot invite'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'forbidden@test.invalid'
  )$$,
  '42501', 'Only a household owner can invite members.',
  'Unrelated user cannot invite'
);
select results_eq(
  $$select count(*)::integer from cooksmith.household_invitations$$,
  array[0],
  'Unrelated user cannot list invitations'
);

reset role;
insert into cooksmith.app_user_roles (user_id, role, granted_by)
values ('60000000-0000-4000-8000-000000000003', 'admin', null);
insert into cooksmith.household_invitations (
  id, household_id, email, token_hash, status, invited_by, expires_at
) values
  ('63000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001',
   'invitee@test.invalid', encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'),
   'pending', '60000000-0000-4000-8000-000000000001', now() + interval '7 days'),
  ('63000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001',
   'wrong-email@test.invalid', encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex'),
   'pending', '60000000-0000-4000-8000-000000000001', now() + interval '7 days'),
  ('63000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000001',
   'invitee@test.invalid', encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'),
   'expired', '60000000-0000-4000-8000-000000000001', now() + interval '1 second');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
select throws_ok(
  $$select cooksmith.create_household_invitation(
    '61000000-0000-4000-8000-000000000001', 'admin-cannot@test.invalid'
  )$$,
  '42501', 'Only a household owner can invite members.',
  'Application admin role does not imply household owner access'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select throws_ok(
  $$select cooksmith.accept_household_invitation(repeat('b', 64), 'Invitee')$$,
  '42501', 'Sign in with the email address that received this invitation.',
  'Invitation cannot be accepted by a different email identity'
);
select throws_ok(
  $$select cooksmith.accept_household_invitation(repeat('d', 64), 'Invitee')$$,
  '22023', 'This invitation link is invalid.',
  'Unknown invitation token is rejected'
);
select throws_ok(
  $$select cooksmith.accept_household_invitation(repeat('c', 64), 'Invitee')$$,
  '22023', 'This invitation is no longer active.',
  'Expired invitation is rejected'
);
select lives_ok(
  $$select cooksmith.accept_household_invitation(repeat('a', 64), 'Invited Person')$$,
  'Matching authenticated invitee can accept'
);
select results_eq(
  $$select role::text || ':' || status::text from cooksmith.household_members
    where user_id = '60000000-0000-4000-8000-000000000004'$$,
  array['member:active'],
  'Acceptance creates an active member without owner escalation'
);
select results_eq(
  $$select onboarding_step::text || ':' || (onboarding_completed_at is not null)::text
    from cooksmith.profiles where id = '60000000-0000-4000-8000-000000000004'$$,
  array['5:true'],
  'Acceptance completes the invited member profile without household bootstrap'
);
select results_eq(
  $$select status::text from cooksmith.household_invitations
    where id = '63000000-0000-4000-8000-000000000001'$$,
  array['accepted'],
  'Accepted invitation has a terminal status'
);
select throws_ok(
  $$select cooksmith.accept_household_invitation(repeat('a', 64), 'Again')$$,
  '22023', 'This invitation is no longer active.',
  'Invitation cannot be accepted twice'
);

select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select cooksmith.remove_household_member('62000000-0000-4000-8000-000000000001')$$,
  '42501', 'Only a household owner can remove members.',
  'Member cannot remove the household owner'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select cooksmith.remove_household_member(
    (select id from cooksmith.household_members
      where user_id = '60000000-0000-4000-8000-000000000004')
  )$$,
  'Owner can remove a member'
);
select results_eq(
  $$select status::text || ':' || (inactive_at is not null)::text
    from cooksmith.household_members
    where user_id = '60000000-0000-4000-8000-000000000004'$$,
  array['inactive:true'],
  'Removed membership becomes inactive immediately'
);
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select is(
  cooksmith.is_active_household_member('61000000-0000-4000-8000-000000000001'),
  false,
  'Removed member immediately loses household authorisation'
);
select throws_ok(
  $$select cooksmith.list_household_members('61000000-0000-4000-8000-000000000001')$$,
  '42501', 'Active household membership is required.',
  'Removed member cannot list household members'
);

reset role;
select throws_ok(
  $$update cooksmith.household_members set status = 'inactive', inactive_at = now()
    where id = '62000000-0000-4000-8000-000000000001'$$,
  '23514', 'The final household owner cannot be removed.',
  'Final owner is protected even outside the member-management RPC'
);
select throws_ok(
  $$update cooksmith.household_members
    set user_id = '60000000-0000-4000-8000-000000000003'
    where id = '62000000-0000-4000-8000-000000000002'$$,
  '23514', 'Membership identifiers cannot be changed.',
  'Membership identifier manipulation is rejected'
);
select throws_ok(
  $$insert into cooksmith.household_members (household_id, user_id, role, status)
    values ('61000000-0000-4000-8000-000000000002',
      '60000000-0000-4000-8000-000000000002', 'member', 'active')$$,
  '23505',
  'duplicate key value violates unique constraint "household_members_one_active_household_per_user"',
  'Database enforces one active household per user'
);

select * from finish();
rollback;
