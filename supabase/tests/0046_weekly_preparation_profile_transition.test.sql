begin;
select plan(28);
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,created_at,updated_at) values
 ('a1030000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-admin@test.invalid','',now(),now()),
 ('a1030000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','profile-member@test.invalid','',now(),now());
insert into cooksmith.app_user_roles(user_id,role) values ('a1030000-0000-4000-8000-000000000001','admin');
select set_config('request.jwt.claims','{"sub":"a1030000-0000-4000-8000-000000000001","role":"authenticated"}',true);
update cooksmith.weekly_preparation_settings set ai_enabled=false,emergency_stop=true,
 model_identifier='gpt-4.1-mini',prompt_version='weekly-preparation-strategy-v13',pricing_version='openai-aud-v1',
 smoke_verified_at=now(),smoke_deployment_sha=repeat('a',40) where singleton;
update cooksmith.recipe_intelligence_settings set ai_enabled=false where singleton;

insert into cooksmith.weekly_preparation_evaluation_runs (
 id,corpus_version,schema_version,planner_version,prompt_version,model_identifier,pricing_version,
 plan_count,deterministic_count,model_call_count,valid_output_count,accepted_count,rejected_count,
 fallback_count,unsupported_count,reviewed_correct_count,total_latency_ms,input_tokens,output_tokens,
 estimated_cost_aud,ambiguous_decision,status,deployment_sha
) values ('a1030000-0000-4000-8000-000000000003','weekly-preparation-corpus-v13','weekly-preparation-plan-v2',
 'weekly-preparation-planner-v13','weekly-preparation-strategy-v13','gpt-4.1-mini','openai-aud-v1',
 30,0,0,0,0,0,0,0,0,0,0,0,0,'fallback','running',repeat('a',40));
set local role authenticated;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'23514','Wait for evaluation and enrichment work to finish','Running evaluation blocks transition');
reset role;
update cooksmith.weekly_preparation_evaluation_runs set status='completed',completed_at=now() where id='a1030000-0000-4000-8000-000000000003';

insert into cooksmith.households(id,name) values ('a1030000-0000-4000-8000-000000000004','Profile test household');
insert into cooksmith.household_recipes(id,household_id,name,servings) values ('a1030000-0000-4000-8000-000000000005','a1030000-0000-4000-8000-000000000004','Synthetic sauce',4);
insert into cooksmith.recipe_content_versions(id,source_kind,recipe_id,household_id,fingerprint,source_snapshot)
values ('a1030000-0000-4000-8000-000000000006','household','a1030000-0000-4000-8000-000000000005','a1030000-0000-4000-8000-000000000004',repeat('c',32),'{}');
insert into cooksmith.recipe_enrichment_jobs(id,source_kind,recipe_id,household_id,recipe_version_id,state)
values ('a1030000-0000-4000-8000-000000000007','household','a1030000-0000-4000-8000-000000000005','a1030000-0000-4000-8000-000000000004','a1030000-0000-4000-8000-000000000006','processing');
set local role authenticated;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'23514','Wait for evaluation and enrichment work to finish','Processing enrichment blocks transition');
reset role;
update cooksmith.recipe_enrichment_jobs set state='completed' where id='a1030000-0000-4000-8000-000000000007';
update cooksmith.weekly_preparation_settings set corpus_version='future-corpus' where singleton;
set local role authenticated;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'23514','Current v13 corpus required','Transition cannot silently replace another corpus');
reset role;
update cooksmith.weekly_preparation_settings set corpus_version='weekly-preparation-corpus-v13' where singleton;

update cooksmith.weekly_preparation_evaluation_runs set status='completed',completed_at=now(),
 deterministic_count=2,model_call_count=28,valid_output_count=28,accepted_count=28,reviewed_correct_count=28,rejected_count=2
 where id='a1030000-0000-4000-8000-000000000003';
insert into cooksmith.weekly_preparation_evaluation_cases(run_id,case_number,case_key,expected_model_call,model_called,outcome,latency_ms,input_tokens,output_tokens,estimated_cost_aud,available_minutes)
 select 'a1030000-0000-4000-8000-000000000003',n,'profile-case-'||n,n<=28,n<=28,
 case when n<=28 then 'model-assisted' else 'deterministic' end,0,0,0,0,30 from generate_series(1,30) n;
set local role authenticated;
select lives_ok($$select cooksmith.accept_weekly_preparation_evaluation('a1030000-0000-4000-8000-000000000003')$$,'Legacy completed evaluation can be accepted before transition');

set local role anon;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'42501',null,'Anonymous callers cannot transition');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1030000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'42501','Administrator access required','Ordinary members cannot transition');
select throws_ok($$select cooksmith_private.configure_weekly_preparation_luna_profile()$$,'42501','Administrator access required','Private implementation also checks identity');
select is_empty($$select * from cooksmith.weekly_preparation_profile_audit$$,'Members cannot see profile audit');
select set_config('request.jwt.claims','{"sub":"a1030000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok($$update cooksmith.weekly_preparation_settings set model_identifier='arbitrary' where singleton$$,'42501',null,'Admin still cannot directly update profile columns');
select throws_ok($$update cooksmith.weekly_preparation_settings set smoke_verified_at=now() where singleton$$,'42501',null,'Admin cannot manufacture smoke evidence');
reset role;
update cooksmith.recipe_intelligence_settings set ai_enabled=true where singleton;
set local role authenticated;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'23514','Disable weekly and recipe AI before changing profile','Running recipe AI blocks transition');
reset role;
update cooksmith.recipe_intelligence_settings set ai_enabled=false where singleton;
update cooksmith.weekly_preparation_settings set ai_enabled=true,emergency_stop=true where singleton;
set local role authenticated;
select throws_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'23514','Disable weekly and recipe AI before changing profile','Weekly AI must be disabled even with emergency stop');
update cooksmith.weekly_preparation_settings set ai_enabled=false where singleton;
select lives_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'Paused admin can prepare the fixed Luna profile');
select results_eq($$select model_identifier,prompt_version,pricing_version,corpus_version from cooksmith.weekly_preparation_settings$$,
 $$values ('gpt-6-luna'::text,'weekly-preparation-strategy-v13-luna-low-v1'::text,'openai-luna-standard-aud-fx1_60-20261015-v1'::text,'weekly-preparation-corpus-v13'::text)$$,'Exact approved identity and unchanged corpus');
select ok((select not ai_enabled and emergency_stop and smoke_verified_at is null and smoke_deployment_sha is null from cooksmith.weekly_preparation_settings),'AI stays disabled and previous smoke evidence is cleared');
select is((select count(*)::int from cooksmith.weekly_preparation_profile_audit),1,'One profile audit record');
select is((select changed_by from cooksmith.weekly_preparation_profile_audit),'a1030000-0000-4000-8000-000000000001'::uuid,'Audit derives actor from authenticated caller');
select is((select previous_profile->>'model' from cooksmith.weekly_preparation_profile_audit),'gpt-4.1-mini','Audit preserves prior model');
select is((select profile->>'model' from cooksmith.weekly_preparation_profile_audit),'gpt-6-luna','Audit records next model');
select throws_ok($$update cooksmith.weekly_preparation_settings set ai_enabled=true,emergency_stop=false where singleton$$,'23514','Current v13 smoke test, recipe coverage and accepted evaluation required','Transition does not bypass activation gate');
select throws_ok($$delete from cooksmith.weekly_preparation_profile_audit$$,'42501',null,'Admin cannot delete audit');
select lives_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'Repeated preparation is idempotent');
select is((select count(*)::int from cooksmith.weekly_preparation_profile_audit),1,'No duplicate audit on retry');
select ok(not has_table_privilege('authenticated','cooksmith.weekly_preparation_profile_audit','INSERT'),'Browser cannot forge audit records');
select is((select count(*)::int from cooksmith.weekly_preparation_evaluation_runs where id='a1030000-0000-4000-8000-000000000003'),1,'Prior evaluation history survives profile change');
reset role;
update cooksmith.weekly_preparation_settings set smoke_verified_at=now(),smoke_deployment_sha=repeat('b',40) where singleton;
set local role authenticated;
select lives_ok($$select cooksmith.configure_weekly_preparation_luna_profile()$$,'Retry after smoke evidence is also idempotent');
select is((select smoke_deployment_sha from cooksmith.weekly_preparation_settings),repeat('b',40),'Retry preserves new smoke evidence');
select is((select count(*)::int from cooksmith.weekly_preparation_evaluation_acceptances where run_id='a1030000-0000-4000-8000-000000000003'),1,'Historical acceptance remains intact');
select * from finish();
rollback;
