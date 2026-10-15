begin;
select plan(5);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at)
values ('a1030000-0000-4000-8000-000000000047','00000000-0000-0000-0000-000000000000','authenticated','authenticated','quality-admin@test.invalid','',now(),now());
insert into cooksmith.app_user_roles(user_id,role) values ('a1030000-0000-4000-8000-000000000047','admin');
select set_config('request.jwt.claims','{"sub":"a1030000-0000-4000-8000-000000000047","role":"authenticated"}',true);
update cooksmith.weekly_preparation_settings set ai_enabled=false,emergency_stop=false,model_identifier='gpt-6-luna',
 prompt_version='weekly-preparation-strategy-v13-luna-low-v1',pricing_version='openai-luna-standard-aud-fx1_60-20261015-v1',smoke_verified_at=now(),smoke_deployment_sha=repeat('a',40) where singleton;
update cooksmith.recipe_intelligence_settings set ai_enabled=false where singleton;
set local role authenticated;
select lives_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'Existing admin action transitions v1 to v2');
select is((select prompt_version from cooksmith.weekly_preparation_settings),'weekly-preparation-strategy-v13-luna-low-v2','New prompt has a distinct identity');
select ok((select not ai_enabled and smoke_verified_at is null and smoke_deployment_sha is null from cooksmith.weekly_preparation_settings),'Transition cannot retain previous smoke or enable AI');
select is((select previous_profile->>'prompt' from cooksmith.weekly_preparation_profile_audit where changed_by='a1030000-0000-4000-8000-000000000047'),'weekly-preparation-strategy-v13-luna-low-v1','Old profile retained in audit');
select throws_ok($$update cooksmith.weekly_preparation_settings set ai_enabled=true where singleton$$,'23514','Current v13 smoke test, recipe coverage and accepted evaluation required','Fresh acceptance and coverage remain mandatory');
select * from finish();
rollback;
