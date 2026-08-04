begin;

alter table cooksmith.weekly_preparation_settings
  disable trigger weekly_preparation_settings_audit_change;

update cooksmith.weekly_preparation_settings
set
  ai_enabled = false,
  corpus_version = 'weekly-preparation-corpus-v10',
  prompt_version = 'weekly-preparation-strategy-v10',
  smoke_verified_at = null,
  smoke_deployment_sha = null
where singleton = true;

alter table cooksmith.weekly_preparation_settings
  enable trigger weekly_preparation_settings_audit_change;

delete from cooksmith.weekly_preparation_plans
where planner_version <> 'weekly-preparation-planner-v10'
   or generation <> 'model-assisted'
   or jsonb_array_length(
     case
       when jsonb_typeof(result -> 'tasks') = 'array' then result -> 'tasks'
       else '[]'::jsonb
     end
   ) = 0;

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
        and acceptance.planner_version = 'weekly-preparation-planner-v10'
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
  'Audits AI controls and prevents v10 activation until recipe coverage, hosted smoke evidence and the current evaluation are accepted.';

commit;
