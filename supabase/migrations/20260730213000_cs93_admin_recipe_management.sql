begin;

create function cooksmith.admin_recipe_enrichment_list(
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
    and status_filter not in ('preparing', 'ready', 'failed', 'not_scheduled') then
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
        when active.id is not null then 'ready'
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
      select enrichment.id, enrichment.activated_at, enrichment.provider
      from cooksmith.recipe_enrichments enrichment
      where enrichment.recipe_version_id = versions.id and enrichment.is_active
      order by (enrichment.provider <> 'deterministic') desc, enrichment.activated_at desc
      limit 1
    ) active on true
    left join lateral (
      select
        bool_or(job.state in ('pending', 'processing')) has_active_work,
        bool_or(job.state = 'failed' and job.model_key = 'provider-assisted-v1')
          has_provider_failure
      from cooksmith.recipe_enrichment_jobs job
      where job.recipe_version_id = versions.id
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

create function cooksmith.admin_retry_recipe_enrichment(
  target_recipe_id uuid,
  target_source_kind cooksmith.recipe_enrichment_source
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  retried boolean := false;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from cooksmith.recipe_intelligence_settings
    where singleton and ai_enabled and not emergency_stop
  ) then
    raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000';
  end if;

  update cooksmith.recipe_enrichment_jobs job
  set state = 'pending',
      attempt_count = 0,
      available_at = now(),
      leased_until = null,
      completed_at = null,
      failure_category = null,
      provider_http_status = null,
      provider_error_code = null,
      provider_error_param = null,
      provider_request_id = null
  where job.id = (
    select candidate.id
    from cooksmith.recipe_enrichment_jobs candidate
    where candidate.source_kind = target_source_kind
      and candidate.model_key = 'provider-assisted-v1'
      and candidate.state = 'failed'
      and (target_source_kind <> 'household' or candidate.recipe_id = target_recipe_id)
      and (target_source_kind <> 'shared_platform' or candidate.imported_recipe_id = target_recipe_id)
      and candidate.recipe_version_id = (
        select version.id
        from cooksmith.recipe_content_versions version
        where version.source_kind = target_source_kind
          and (target_source_kind <> 'household' or version.recipe_id = target_recipe_id)
          and (target_source_kind <> 'shared_platform' or version.imported_recipe_id = target_recipe_id)
        order by version.created_at desc, version.id desc
        limit 1
      )
      and not exists (
        select 1 from cooksmith.recipe_enrichments active
        where active.recipe_version_id = candidate.recipe_version_id
          and active.is_active
          and active.provider <> 'deterministic'
      )
    order by candidate.updated_at desc, candidate.id desc
    limit 1
    for update skip locked
  );
  retried := found;
  if retried then
    insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
    values (auth.uid(), 'retry_recipe');
  end if;
  return retried;
end;
$$;

revoke all on function cooksmith.admin_recipe_enrichment_list(text, text)
  from public, anon;
revoke all on function cooksmith.admin_retry_recipe_enrichment(
  uuid, cooksmith.recipe_enrichment_source
) from public, anon;
grant execute on function cooksmith.admin_recipe_enrichment_list(text, text)
  to authenticated;
grant execute on function cooksmith.admin_retry_recipe_enrichment(
  uuid, cooksmith.recipe_enrichment_source
) to authenticated;

comment on function cooksmith.admin_recipe_enrichment_list(text, text) is
  'Admin-only, privacy-safe current-version recipe insight status list.';
comment on function cooksmith.admin_retry_recipe_enrichment(
  uuid, cooksmith.recipe_enrichment_source
) is 'Admin-only retry of a current failed provider-assisted recipe enrichment.';

commit;
