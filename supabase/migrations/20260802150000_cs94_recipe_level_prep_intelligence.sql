begin;

alter table cooksmith.recipe_enrichment_jobs
  alter column schema_version set default 'recipe-intelligence-v2',
  alter column rules_version set default 'cooksmith-rules-v2';

insert into cooksmith.recipe_enrichment_jobs (
  source_kind, recipe_id, imported_recipe_id, household_id,
  recipe_version_id, schema_version, rules_version, model_key
)
select
  versions.source_kind, versions.recipe_id, versions.imported_recipe_id, versions.household_id,
  versions.id, 'recipe-intelligence-v2', 'cooksmith-rules-v2', 'provider-assisted-v1'
from cooksmith.recipe_content_versions versions
where versions.id in (
  select distinct on (source_kind, recipe_id, imported_recipe_id) id
  from cooksmith.recipe_content_versions
  order by source_kind, recipe_id, imported_recipe_id, created_at desc, id desc
)
on conflict (recipe_version_id, schema_version, rules_version, model_key) do nothing;

alter table cooksmith.weekly_preparation_settings
  disable trigger weekly_preparation_settings_audit_change;

update cooksmith.weekly_preparation_settings
set
  ai_enabled = false,
  corpus_version = 'weekly-preparation-corpus-v7',
  prompt_version = 'weekly-preparation-strategy-v7',
  smoke_verified_at = null,
  smoke_deployment_sha = null
where singleton = true;

alter table cooksmith.weekly_preparation_settings
  enable trigger weekly_preparation_settings_audit_change;

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
      and acceptance.schema_version = 'weekly-preparation-plan-v2'
      and acceptance.planner_version = 'weekly-preparation-planner-v7'
      and acceptance.prompt_version = new.prompt_version
      and acceptance.model_identifier = new.model_identifier
      and new.smoke_verified_at is not null
      and new.smoke_deployment_sha is not null
      and run.deployment_sha = new.smoke_deployment_sha
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

comment on function cooksmith.audit_weekly_preparation_settings() is
  'Audits AI controls and binds activation to recipe-level preparation intelligence evaluation.';

create or replace function cooksmith.admin_recipe_enrichment_list(
  search_text text default null,
  status_filter text default null
)
returns table (
  recipe_id uuid,
  source_kind cooksmith.recipe_enrichment_source,
  name text,
  owner_label text,
  updated_at timestamptz,
  status text,
  completed_at timestamptz,
  ai_active boolean,
  retryable boolean,
  can_edit boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if status_filter is not null
    and status_filter not in ('preparing', 'ready', 'limited', 'failed', 'not_scheduled') then
    raise exception 'invalid_status_filter' using errcode = '22023';
  end if;

  return query
  with recipes as (
    select household.id, 'household'::cooksmith.recipe_enrichment_source source_kind,
      household.name, 'Household recipe'::text owner_label, household.updated_at,
      household.household_id
    from cooksmith.household_recipes household
    where household.archived_at is null
    union all
    select shared.id, 'shared_platform'::cooksmith.recipe_enrichment_source,
      shared.name, 'Shared platform recipe'::text, shared.updated_at, null::uuid
    from cooksmith.imported_recipes shared
    where shared.visibility = 'public' and shared.archived_at is null
  ),
  current_outcomes as (
    select recipes.*,
      versions.id version_id,
      active.activated_at completed_at,
      coalesce(active.provider <> 'deterministic', false) ai_active,
      case
        when active.opportunity_count > 0 then 'ready'
        when active.id is not null then 'limited'
        when jobs.has_active_work then 'preparing'
        when jobs.has_provider_failure then 'failed'
        else 'not_scheduled'
      end status,
      coalesce(jobs.has_provider_failure, false)
        and active.id is null
        and settings.ai_enabled
        and not settings.emergency_stop retryable
    from recipes
    cross join cooksmith.recipe_intelligence_settings settings
    left join lateral (
      select version.id
      from cooksmith.recipe_content_versions version
      where version.source_kind = recipes.source_kind
        and (recipes.source_kind <> 'household' or version.recipe_id = recipes.id)
        and (recipes.source_kind <> 'shared_platform' or version.imported_recipe_id = recipes.id)
      order by version.created_at desc, version.id desc
      limit 1
    ) versions on true
    left join lateral (
      select enrichment.id, enrichment.activated_at, enrichment.provider,
        jsonb_array_length(enrichment.result -> 'preparationOpportunities') opportunity_count
      from cooksmith.recipe_enrichments enrichment
      where enrichment.recipe_version_id = versions.id
        and enrichment.is_active
        and enrichment.schema_version = 'recipe-intelligence-v2'
        and enrichment.rules_version = 'cooksmith-rules-v2'
        and jsonb_typeof(enrichment.result -> 'preparationOpportunities') = 'array'
      order by enrichment.activated_at desc
      limit 1
    ) active on true
    left join lateral (
      select
        bool_or(job.state in ('pending', 'processing')) has_active_work,
        bool_or(job.state = 'failed' and job.model_key = 'provider-assisted-v1')
          has_provider_failure
      from cooksmith.recipe_enrichment_jobs job
      where job.recipe_version_id = versions.id
        and job.schema_version = 'recipe-intelligence-v2'
        and job.rules_version = 'cooksmith-rules-v2'
    ) jobs on true
  )
  select outcome.id, outcome.source_kind, outcome.name, outcome.owner_label,
    outcome.updated_at, outcome.status, outcome.completed_at, outcome.ai_active,
    outcome.retryable,
    outcome.source_kind = 'household' and exists (
      select 1
      from cooksmith.household_members member
      where member.household_id = outcome.household_id
        and member.user_id = auth.uid()
        and member.status = 'active'
    )
  from current_outcomes outcome
  where (search_text is null or outcome.name ilike '%' || search_text || '%')
    and (status_filter is null or outcome.status = status_filter)
  order by outcome.name, outcome.id;
end;
$$;

comment on function cooksmith.admin_recipe_enrichment_list(text, text) is
  'Admin-only recipe insight status that distinguishes usable v2 preparation coverage.';

commit;
