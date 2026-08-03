begin;

create or replace function cooksmith_private.weekly_preparation_recipes_ready()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with latest_versions as (
    select distinct on (source_kind, recipe_id, imported_recipe_id)
      id, source_kind, recipe_id, imported_recipe_id
    from cooksmith.recipe_content_versions
    where (
      source_kind = 'household'
      and exists (
        select 1 from cooksmith.household_recipes recipe
        where recipe.id = recipe_content_versions.recipe_id and recipe.archived_at is null
      )
    ) or (
      source_kind = 'shared_platform'
      and exists (
        select 1 from cooksmith.imported_recipes recipe
        where recipe.id = recipe_content_versions.imported_recipe_id
          and recipe.visibility = 'public' and recipe.archived_at is null
      )
    )
    order by source_kind, recipe_id, imported_recipe_id, created_at desc, id desc
  )
  select
    coalesce(bool_and(
      exists (
        select 1
        from cooksmith.recipe_enrichments enrichment
        where enrichment.recipe_version_id = latest_versions.id
          and enrichment.is_active
          and enrichment.schema_version = 'recipe-intelligence-v2'
          and enrichment.rules_version = 'cooksmith-rules-v2'
          and jsonb_typeof(enrichment.result -> 'preparationOpportunities') = 'array'
      )
      and not exists (
        select 1
        from cooksmith.recipe_enrichment_jobs job
        where job.recipe_version_id = latest_versions.id
          and job.schema_version = 'recipe-intelligence-v2'
          and job.rules_version = 'cooksmith-rules-v2'
          and job.state in ('pending', 'processing')
      )
    ), true)
  from latest_versions;
$$;

revoke all on function cooksmith_private.weekly_preparation_recipes_ready() from public, anon, authenticated;
grant execute on function cooksmith_private.weekly_preparation_recipes_ready() to service_role;

create or replace function cooksmith.weekly_preparation_recipe_readiness()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select cooksmith_private.weekly_preparation_recipes_ready();
$$;

revoke all on function cooksmith.weekly_preparation_recipe_readiness() from public, anon, authenticated;
grant execute on function cooksmith.weekly_preparation_recipe_readiness() to service_role;

alter table cooksmith.weekly_preparation_settings
  disable trigger weekly_preparation_settings_audit_change;

update cooksmith.weekly_preparation_settings
set
  ai_enabled = false,
  corpus_version = 'weekly-preparation-corpus-v8',
  prompt_version = 'weekly-preparation-strategy-v8',
  smoke_verified_at = null,
  smoke_deployment_sha = null
where singleton = true;

alter table cooksmith.weekly_preparation_settings
  enable trigger weekly_preparation_settings_audit_change;

delete from cooksmith.weekly_preparation_plans
where planner_version <> 'weekly-preparation-planner-v8'
   or generation <> 'model-assisted';

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
        and acceptance.planner_version = 'weekly-preparation-planner-v8'
        and acceptance.prompt_version = new.prompt_version
        and acceptance.model_identifier = new.model_identifier
        and new.smoke_verified_at is not null
        and new.smoke_deployment_sha is not null
        and run.deployment_sha = new.smoke_deployment_sha
    )
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

comment on function cooksmith_private.weekly_preparation_recipes_ready() is
  'Release gate requiring current recipe versions to have active v2 preparation intelligence and no unfinished v2 jobs.';
comment on function cooksmith.weekly_preparation_recipe_readiness() is
  'Service-only readiness probe used by the hosted weekly preparation evaluation.';
comment on function cooksmith.audit_weekly_preparation_settings() is
  'Audits AI controls and prevents activation until real recipe enrichment coverage and current evaluation evidence are complete.';

commit;
