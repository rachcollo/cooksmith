begin;

alter table cooksmith.weekly_preparation_settings
  add column corpus_version text not null default 'weekly-preparation-corpus-v1',
  add column prompt_version text not null default 'weekly-preparation-prompt-v1',
  add column pricing_version text not null default 'openai-aud-v1',
  add column smoke_verified_at timestamptz,
  add column smoke_deployment_sha text;

alter table cooksmith.weekly_preparation_evaluation_runs
  add column prompt_version text not null default 'weekly-preparation-prompt-v1',
  add column status text not null default 'completed',
  add column completed_at timestamptz,
  add column deployment_sha text,
  add column error_reason text;

update cooksmith.weekly_preparation_evaluation_runs
set completed_at = created_at
where status = 'completed' and completed_at is null;

alter table cooksmith.weekly_preparation_evaluation_runs
  add constraint weekly_preparation_evaluation_status_valid
    check (status in ('running', 'completed', 'failed')),
  add constraint weekly_preparation_evaluation_completion_valid
    check (
      (status = 'completed' and completed_at is not null and error_reason is null)
      or (status = 'failed' and completed_at is not null and error_reason is not null)
      or (status = 'running' and completed_at is null)
    );

create unique index weekly_preparation_evaluation_one_running
  on cooksmith.weekly_preparation_evaluation_runs ((true))
  where status = 'running';

create table cooksmith.weekly_preparation_evaluation_cases (
  run_id uuid not null references cooksmith.weekly_preparation_evaluation_runs(id) on delete cascade,
  case_number integer not null,
  case_key text not null,
  expected_model_call boolean not null,
  model_called boolean not null,
  outcome text not null,
  reason_code text,
  latency_ms integer not null,
  input_tokens integer not null,
  output_tokens integer not null,
  estimated_cost_aud numeric(12, 6) not null,
  primary key (run_id, case_number),
  unique (run_id, case_key),
  constraint weekly_preparation_evaluation_case_number check (case_number between 1 and 30),
  constraint weekly_preparation_evaluation_case_outcome
    check (outcome in ('deterministic', 'model-assisted', 'fallback', 'failed')),
  constraint weekly_preparation_evaluation_case_metrics check (
    latency_ms >= 0 and input_tokens >= 0 and output_tokens >= 0 and estimated_cost_aud >= 0
  ),
  constraint weekly_preparation_expected_model_called
    check (not expected_model_call or model_called)
);

create table cooksmith.weekly_preparation_evaluation_acceptances (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references cooksmith.weekly_preparation_evaluation_runs(id) on delete restrict,
  corpus_version text not null,
  schema_version text not null,
  planner_version text not null,
  prompt_version text not null,
  model_identifier text not null,
  accepted_by uuid not null references auth.users(id) on delete restrict,
  accepted_at timestamptz not null default now()
);

create table cooksmith.weekly_preparation_generation_attempts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  plan_key text not null,
  request_key text not null,
  outcome text not null,
  reason_code text,
  model_called boolean not null default false,
  latency_ms integer not null default 0,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost_aud numeric(12, 6) not null default 0,
  correlation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (household_id, request_key),
  constraint weekly_preparation_generation_outcome
    check (outcome in ('deterministic', 'model-assisted', 'fallback', 'failed')),
  constraint weekly_preparation_generation_metrics
    check (latency_ms >= 0 and input_tokens >= 0 and output_tokens >= 0 and estimated_cost_aud >= 0)
);

alter table cooksmith.weekly_preparation_evaluation_cases enable row level security;
alter table cooksmith.weekly_preparation_evaluation_acceptances enable row level security;
alter table cooksmith.weekly_preparation_generation_attempts enable row level security;

create policy weekly_preparation_evaluation_cases_admin_select
on cooksmith.weekly_preparation_evaluation_cases for select to authenticated
using ((select cooksmith.has_application_role('admin')));

create policy weekly_preparation_evaluation_acceptances_admin_select
on cooksmith.weekly_preparation_evaluation_acceptances for select to authenticated
using ((select cooksmith.has_application_role('admin')));

create policy weekly_preparation_generation_household_select
on cooksmith.weekly_preparation_generation_attempts for select to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

grant select on cooksmith.weekly_preparation_evaluation_cases to authenticated;
grant select on cooksmith.weekly_preparation_evaluation_acceptances to authenticated;
grant select on cooksmith.weekly_preparation_generation_attempts to authenticated;
grant all on cooksmith.weekly_preparation_evaluation_cases to service_role;
grant all on cooksmith.weekly_preparation_evaluation_acceptances to service_role;
grant all on cooksmith.weekly_preparation_generation_attempts to service_role;

create function cooksmith.accept_weekly_preparation_evaluation(target_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  accepted_id uuid;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  insert into cooksmith.weekly_preparation_evaluation_acceptances (
    run_id, corpus_version, schema_version, planner_version, prompt_version, model_identifier,
    accepted_by
  )
  select
    run.id, run.corpus_version, run.schema_version, run.planner_version, run.prompt_version,
    run.model_identifier, (select auth.uid())
  from cooksmith.weekly_preparation_evaluation_runs run
  where run.id = target_run_id
    and run.status = 'completed'
    and run.plan_count = 30
    and run.model_call_count > 0
    and run.valid_output_count = run.model_call_count
    and run.fallback_count = 0
    and run.unsupported_count = 0
    and run.reviewed_correct_count = 30
    and (
      select count(*) = 30
      from cooksmith.weekly_preparation_evaluation_cases evaluation_case
      where evaluation_case.run_id = run.id
    )
  returning id into accepted_id;

  if accepted_id is null then
    raise exception 'Completed current 30-plan evaluation required' using errcode = '23514';
  end if;
  return accepted_id;
end;
$$;

drop trigger weekly_preparation_settings_audit_change
  on cooksmith.weekly_preparation_settings;

create or replace function cooksmith.audit_weekly_preparation_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if new.ai_enabled and not new.emergency_stop and not exists (
    select 1
    from cooksmith.weekly_preparation_evaluation_acceptances acceptance
    join cooksmith.weekly_preparation_evaluation_runs run on run.id = acceptance.run_id
    where run.status = 'completed'
      and acceptance.corpus_version = new.corpus_version
      and acceptance.schema_version = 'weekly-preparation-plan-v1'
      and acceptance.planner_version = 'weekly-preparation-planner-v1'
      and acceptance.prompt_version = new.prompt_version
      and acceptance.model_identifier = new.model_identifier
      and new.smoke_verified_at is not null
      and new.smoke_deployment_sha is not null
    order by acceptance.accepted_at desc
    limit 1
  ) then
    raise exception 'Current smoke test and accepted 30-plan evaluation required'
      using errcode = '23514';
  end if;
  if old.ai_enabled is distinct from new.ai_enabled
    or old.emergency_stop is distinct from new.emergency_stop then
    insert into cooksmith.weekly_preparation_settings_audit (
      previous_ai_enabled, ai_enabled, previous_emergency_stop, emergency_stop, changed_by
    ) values (
      old.ai_enabled, new.ai_enabled, old.emergency_stop, new.emergency_stop, (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger weekly_preparation_settings_audit_change
before update of ai_enabled, emergency_stop on cooksmith.weekly_preparation_settings
for each row execute function cooksmith.audit_weekly_preparation_settings();

revoke all on function cooksmith.accept_weekly_preparation_evaluation(uuid)
  from public, anon;
grant execute on function cooksmith.accept_weekly_preparation_evaluation(uuid)
  to authenticated;

comment on table cooksmith.weekly_preparation_evaluation_cases is
  'Privacy-safe case evidence for the synthetic versioned release evaluation.';
comment on table cooksmith.weekly_preparation_evaluation_acceptances is
  'Explicit administrator acceptance bound to an exact generation identity.';
comment on table cooksmith.weekly_preparation_generation_attempts is
  'Privacy-safe, idempotent weekly preparation generation telemetry.';

commit;
