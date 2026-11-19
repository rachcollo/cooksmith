begin;
select no_plan();

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

update auth.users set email_confirmed_at = now() where email like '%@test.invalid';

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


select ok(not has_column_privilege('authenticated', 'cooksmith.household_invitations', 'token_hash', 'select'), 'Even owners cannot select token hashes');
select ok(not has_function_privilege('authenticated', 'cooksmith.claim_household_invitation_delivery(uuid,text)', 'execute'), 'Client cannot issue a token or read mail context');
select ok(not has_function_privilege('anon', 'cooksmith.create_household_invitation(uuid,text)', 'execute'), 'Anonymous reservation is forbidden');
select ok(not has_function_privilege('authenticated', 'cooksmith.finish_household_invitation_delivery(uuid,boolean)', 'execute'), 'Client cannot forge delivery success');
select ok(not has_table_privilege('authenticated', 'cooksmith.household_invitation_send_attempts', 'insert'), 'Client cannot forge send history');
select is(pg_get_function_result('cooksmith.create_household_invitation(uuid,text)'::regprocedure), 'uuid', 'Create returns only an attempt ID');
select is(pg_get_function_result('cooksmith.resend_household_invitation(uuid)'::regprocedure), 'uuid', 'Resend returns only an attempt ID');

set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000002', 'new@test.invalid')$$, '42501', 'Only a household owner can invite members.', 'Cross-household create denied');
select lives_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'not-an-account@test.invalid')$$, 'A new recipient can be invited without an Auth lookup or signup');
reset role;
select is((select count(*)::integer from auth.users where email = 'not-an-account@test.invalid'), 0, 'Sending does not create an Auth account');
set local role authenticated;
reset role;
insert into cooksmith.household_invitations(id, household_id, email, token_hash, invited_by, status, expires_at) values
('64000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'legacy@test.invalid', encode(extensions.digest(repeat('7',64),'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', 'expired', now() + interval '1 day'),
('64000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000001', 'legacy@test.invalid', encode(extensions.digest(repeat('8',64),'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', 'pending', now() + interval '7 days');
set local role authenticated;
select set_config('test.legacy_attempt', cooksmith.resend_household_invitation('64000000-0000-4000-8000-000000000001')::text, true);
reset role;
select is((select invitation_id from cooksmith.household_invitation_send_attempts where id = current_setting('test.legacy_attempt')::uuid), '64000000-0000-4000-8000-000000000002'::uuid, 'Resending an expired predecessor reuses the current pending invitation');
set local role service_role;
select lives_ok($$select cooksmith.claim_household_invitation_delivery(current_setting('test.legacy_attempt')::uuid, repeat('9',64))$$, 'Legacy resend can claim without colliding with the unique pending email');
reset role;
select is((select status::text from cooksmith.household_invitations where id = '64000000-0000-4000-8000-000000000001'), 'expired', 'Legacy predecessor remains expired');
set local role authenticated;
select set_config('test.attempt', cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'invitee@test.invalid')::text, true);
reset role;
select is((select count(*)::integer from auth.users where email = 'invitee@test.invalid'), 1, 'Reservation does not duplicate an existing account');
select is((select count(*)::integer from cooksmith.household_invitations where email = 'invitee@test.invalid'), 1, 'One pending invitation created');
select set_config('test.invitation', (select invitation_id::text from cooksmith.household_invitation_send_attempts where id = current_setting('test.attempt')::uuid), true);
set local role service_role;
select lives_ok($$select cooksmith.claim_household_invitation_delivery(current_setting('test.attempt')::uuid, encode(extensions.digest(repeat('a',64),'sha256'),'hex'))$$, 'Server claims reserved delivery');
select throws_ok($$select cooksmith.claim_household_invitation_delivery(current_setting('test.attempt')::uuid, repeat('b',64))$$, '22023', 'Delivery unavailable.', 'Duplicate claim cannot issue another email');
select lives_ok($$select cooksmith.finish_household_invitation_delivery(current_setting('test.attempt')::uuid, false)$$, 'Failed provider attempt is recorded');
reset role;
select is((select status from cooksmith.household_invitation_send_attempts where id = current_setting('test.attempt')::uuid), 'failed', 'Failure remains counted');
set local role authenticated;
select throws_ok($$select cooksmith.resend_household_invitation(current_setting('test.invitation')::uuid)$$, 'P0001', 'Invitation rate limit reached.', 'Failure does not bypass cooldown');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000005', true);
select throws_ok($$select cooksmith.resend_household_invitation(current_setting('test.invitation')::uuid)$$, '42501', 'Only a household owner can invite members.', 'Cross-household resend denied');
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000002', 'INVITEE@test.invalid')$$, 'P0001', 'Invitation rate limit reached.', 'Recipient limit spans households and case variants');
reset role;
update cooksmith.household_invitation_send_attempts set created_at = statement_timestamp() - interval '2 minutes';
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select set_config('test.retry', cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'invitee@test.invalid')::text, true);
reset role;
select is((select count(*)::integer from cooksmith.household_invitations where email = 'invitee@test.invalid'), 1, 'Retry reuses pending invitation without owner cleanup');
set local role service_role;
select lives_ok($$select cooksmith.claim_household_invitation_delivery(current_setting('test.retry')::uuid, encode(extensions.digest(repeat('b',64),'sha256'),'hex'))$$, 'Retry rotates token server-side');
reset role;
update auth.users set email_confirmed_at = null where id = '60000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select throws_ok($$select cooksmith.accept_household_invitation(repeat('b',64),'Invitee')$$, '42501', 'A verified email account is required.', 'Unverified matching account cannot accept');
reset role;
update auth.users set email_confirmed_at = now() where id = '60000000-0000-4000-8000-000000000004';
set local role authenticated;
select throws_ok($$select cooksmith.accept_household_invitation(repeat('a',64),'Invitee')$$, '22023', 'This invitation link is invalid.', 'Rotated token cannot be replayed');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000003', true);
select throws_ok($$select cooksmith.accept_household_invitation(repeat('b',64),'Wrong')$$, '42501', 'Sign in with the email address that received this invitation.', 'Wrong verified email denied');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select lives_ok($$select cooksmith.accept_household_invitation(repeat('b',64),'Invitee')$$, 'Matching verified recipient accepts');
select throws_ok($$select cooksmith.accept_household_invitation(repeat('b',64),'Invitee')$$, '22023', 'This invitation is no longer active.', 'Used token replay denied');
reset role;
-- All rate windows count attempts, regardless of failure; no email or account lookup is needed.
update cooksmith.household_invitation_send_attempts set created_at = statement_timestamp() - interval '2 minutes';
insert into cooksmith.household_invitation_send_attempts(invitation_id, household_id, recipient_hash, created_by, created_at)
select current_setting('test.invitation')::uuid, '61000000-0000-4000-8000-000000000001', encode(extensions.digest('invitee@test.invalid','sha256'),'hex'), '60000000-0000-4000-8000-000000000001', statement_timestamp() - interval '3 minutes';
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000005', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000002', 'invitee@test.invalid')$$, 'P0001', 'Invitation rate limit reached.', 'Recipient hourly cap is authoritative');
reset role;
insert into cooksmith.household_invitation_send_attempts(invitation_id, household_id, recipient_hash, created_by, created_at)
select current_setting('test.invitation')::uuid, '61000000-0000-4000-8000-000000000001', encode(extensions.digest('other-' || n,'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', statement_timestamp() - interval '3 minutes' from generate_series(1,20) n;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'fresh@test.invalid')$$, 'P0001', 'Invitation rate limit reached.', 'Household cap cannot be bypassed with new recipients');
reset role;

-- Daily windows, independent of hourly cooldowns.
update cooksmith.household_invitation_send_attempts set created_at = statement_timestamp() - interval '2 hours';
insert into cooksmith.household_invitation_send_attempts(invitation_id, household_id, recipient_hash, created_by, created_at)
select current_setting('test.invitation')::uuid, '61000000-0000-4000-8000-000000000001', encode(extensions.digest('invitee@test.invalid','sha256'),'hex'), '60000000-0000-4000-8000-000000000001', statement_timestamp() - interval '2 hours' from generate_series(1,2);
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000005', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000002', 'invitee@test.invalid')$$, 'P0001', 'Invitation rate limit reached.', 'Recipient daily cap is authoritative');
reset role;
insert into cooksmith.household_invitation_send_attempts(invitation_id, household_id, recipient_hash, created_by, created_at)
select current_setting('test.invitation')::uuid, '61000000-0000-4000-8000-000000000001', encode(extensions.digest('daily-' || n,'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', statement_timestamp() - interval '2 hours' from generate_series(1,25) n;
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'fresh@test.invalid')$$, 'P0001', 'Invitation rate limit reached.', 'Household daily cap is authoritative');
select set_config('request.jwt.claim.sub', '', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'fresh@test.invalid')$$, '42501', 'Authentication is required.', 'Missing identity fails closed');
reset role;
update auth.users set is_anonymous = true where id = '60000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000001', true);
select throws_ok($$select cooksmith.create_household_invitation('61000000-0000-4000-8000-000000000001', 'fresh@test.invalid')$$, '42501', 'Authentication is required.', 'Anonymous Auth account with a member row still cannot send');
reset role;
insert into cooksmith.household_invitations(household_id, email, token_hash, invited_by, status, cancelled_at, created_at, expires_at) values
('61000000-0000-4000-8000-000000000001', 'invitee@test.invalid', encode(extensions.digest(repeat('c',64),'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', 'cancelled', now(), now() - interval '8 days', now() + interval '1 day'),
('61000000-0000-4000-8000-000000000001', 'invitee@test.invalid', encode(extensions.digest(repeat('d',64),'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', 'pending', null, now() - interval '8 days', now() - interval '1 day'),
('61000000-0000-4000-8000-000000000001', 'other-owner@test.invalid', encode(extensions.digest(repeat('e',64),'sha256'),'hex'), '60000000-0000-4000-8000-000000000001', 'pending', null, now(), now() + interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000004', true);
select throws_ok($$select cooksmith.accept_household_invitation(repeat('c',64),'Invitee')$$, '22023', 'This invitation is no longer active.', 'Cancelled token denied');
select throws_ok($$select cooksmith.accept_household_invitation(repeat('d',64),'Invitee')$$, '22023', 'This invitation has expired.', 'Pending token with expired timestamp denied');
select set_config('request.jwt.claim.sub', '60000000-0000-4000-8000-000000000005', true);
select throws_ok($$select cooksmith.accept_household_invitation(repeat('e',64),'Other owner')$$, '23505', 'Your account already belongs to a household.', 'Acceptance cannot move an existing user across households');
reset role;
select * from finish();
rollback;
