begin;

alter table cooksmith.weekly_preparation_settings
  disable trigger weekly_preparation_settings_audit_change;

update cooksmith.weekly_preparation_settings
set
  ai_enabled = false,
  corpus_version = 'weekly-preparation-corpus-v11',
  prompt_version = 'weekly-preparation-strategy-v11',
  smoke_verified_at = null,
  smoke_deployment_sha = null
where singleton = true;

alter table cooksmith.weekly_preparation_settings
  enable trigger weekly_preparation_settings_audit_change;

delete from cooksmith.weekly_preparation_plans
where planner_version <> 'weekly-preparation-planner-v11';

create or replace function cooksmith.accept_weekly_preparation_evaluation(target_run_id uuid)
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
    and run.model_call_count = 27
    and run.valid_output_count = run.model_call_count
    and run.fallback_count = 0
    and run.unsupported_count = 0
    and run.reviewed_correct_count >= 28
    and run.rejected_count <= 2
    and (
      select count(*) = 30
      from cooksmith.weekly_preparation_evaluation_cases evaluation_case
      where evaluation_case.run_id = run.id
    )
  returning id into accepted_id;

  if accepted_id is null then
    raise exception 'Completed current 30-plan evaluation meeting the quality threshold required'
      using errcode = '23514';
  end if;
  return accepted_id;
end;
$$;

comment on function cooksmith.accept_weekly_preparation_evaluation(uuid) is
  'Allows an administrator to accept 28 of 30 quality passes when all 27 eligible cases called the model, every model output is valid and no fallback or unsupported evidence exists.';

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
  if new.ai_enabled and not new.emergency_stop and (
    not cooksmith_private.weekly_preparation_recipes_ready()
    or not exists (
      select 1
      from cooksmith.weekly_preparation_evaluation_acceptances acceptance
      join cooksmith.weekly_preparation_evaluation_runs run on run.id = acceptance.run_id
      where run.status = 'completed'
        and acceptance.corpus_version = new.corpus_version
        and acceptance.schema_version = 'weekly-preparation-plan-v2'
        and acceptance.planner_version = 'weekly-preparation-planner-v11'
        and acceptance.prompt_version = new.prompt_version
        and acceptance.model_identifier = new.model_identifier
        and new.smoke_verified_at is not null
        and new.smoke_deployment_sha is not null
        and run.deployment_sha = new.smoke_deployment_sha
    )
  ) then
    raise exception 'Current smoke test, recipe coverage and accepted 30-plan evaluation required'
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

comment on function cooksmith.audit_weekly_preparation_settings() is
  'Audits AI controls and prevents v11 activation until real-instruction evaluation, recipe coverage and hosted smoke evidence are accepted.';

commit;
