begin;

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
    and run.model_call_count = 28
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
  'Allows an administrator to accept 28 of 30 quality passes when all 28 v13 eligible cases called the model, every model output is valid and no fallback or unsupported evidence exists.';

commit;
