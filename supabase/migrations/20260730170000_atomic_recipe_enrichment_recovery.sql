begin;

alter table cooksmith.recipe_enrichment_backfill_audit
  drop constraint recipe_enrichment_backfill_audit_action_check,
  add constraint recipe_enrichment_backfill_audit_action_check
    check (action in (
      'start', 'pause', 'resume', 'retry_failed',
      'enable_ai', 'disable_ai', 'reprocess_ai', 'recover_exhausted_ai_failures'
    ));

create or replace function cooksmith.activate_recipe_enrichment(
  target_job_id uuid,
  target_provider text,
  target_model_key text,
  target_result jsonb,
  target_overall_confidence text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  job_record cooksmith.recipe_enrichment_jobs%rowtype;
  enrichment_id uuid;
  current_version_id uuid;
begin
  select * into job_record
  from cooksmith.recipe_enrichment_jobs
  where id = target_job_id
  for update;

  if job_record.id is null or job_record.state <> 'processing' then
    raise exception 'job_not_processing' using errcode = 'P0001';
  end if;
  if job_record.source_kind = 'household' and not exists (
    select 1 from cooksmith.household_recipes
    where id = job_record.recipe_id and archived_at is null
  ) then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;
  if job_record.source_kind = 'shared_platform' and not exists (
    select 1 from cooksmith.imported_recipes
    where id = job_record.imported_recipe_id
      and visibility = 'public' and archived_at is null
  ) then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;

  select id into current_version_id
  from cooksmith.recipe_content_versions
  where source_kind = job_record.source_kind
    and (job_record.source_kind <> 'household' or recipe_id = job_record.recipe_id)
    and (job_record.source_kind <> 'shared_platform' or imported_recipe_id = job_record.imported_recipe_id)
  order by created_at desc, id desc
  limit 1;

  if current_version_id is distinct from job_record.recipe_version_id then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;

  update cooksmith.recipe_enrichments
  set is_active = false
  where source_kind = job_record.source_kind and is_active
    and (job_record.source_kind <> 'household' or recipe_id = job_record.recipe_id)
    and (job_record.source_kind <> 'shared_platform' or imported_recipe_id = job_record.imported_recipe_id);

  insert into cooksmith.recipe_enrichments (
    source_kind, recipe_id, imported_recipe_id, household_id, recipe_version_id, job_id,
    schema_version, rules_version, provider, model_key, result, overall_confidence,
    is_active, activated_at
  ) values (
    job_record.source_kind, job_record.recipe_id, job_record.imported_recipe_id,
    job_record.household_id, job_record.recipe_version_id, job_record.id,
    job_record.schema_version, job_record.rules_version, target_provider, target_model_key,
    target_result, target_overall_confidence, true, now()
  ) returning id into enrichment_id;

  update cooksmith.recipe_enrichment_jobs
  set state = 'completed',
      leased_until = null,
      completed_at = now(),
      failure_category = null,
      provider_http_status = null,
      provider_error_code = null,
      provider_error_param = null,
      provider_request_id = null
  where id = job_record.id;

  return enrichment_id;
end;
$$;

create or replace function cooksmith_private.reconcile_active_recipe_enrichment_jobs()
returns integer
language plpgsql
security invoker
set search_path = ''
as $reconcile$
declare reconciled integer;
begin
  -- Reconcile only the contradictory state created by the former split-write boundary.
  update cooksmith.recipe_enrichment_jobs jobs
  set state = 'completed',
      leased_until = null,
      completed_at = coalesce(jobs.completed_at, enrichments.activated_at, now()),
      failure_category = null,
      provider_http_status = null,
      provider_error_code = null,
      provider_error_param = null,
      provider_request_id = null
  from cooksmith.recipe_enrichments enrichments
  where enrichments.job_id = jobs.id
    and enrichments.is_active
    and jobs.state = 'failed';
  get diagnostics reconciled = row_count;
  return reconciled;
end;
$reconcile$;

revoke all on function cooksmith_private.reconcile_active_recipe_enrichment_jobs()
  from public, anon, authenticated;
grant usage on schema cooksmith_private to service_role;
grant execute on function cooksmith_private.reconcile_active_recipe_enrichment_jobs()
  to service_role;

select cooksmith_private.reconcile_active_recipe_enrichment_jobs();

create or replace function cooksmith_private.recipe_enrichment_recoverable_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer
  from cooksmith.recipe_enrichment_jobs jobs
  where jobs.state = 'failed'
    and jobs.model_key = 'provider-assisted-v1'
    and jobs.attempt_count >= 3
    and not exists (
      select 1 from cooksmith.recipe_enrichments active
      where active.is_active and active.recipe_version_id = jobs.recipe_version_id
    )
    and jobs.recipe_version_id = (
      select versions.id
      from cooksmith.recipe_content_versions versions
      where versions.source_kind = jobs.source_kind
        and (jobs.source_kind <> 'household' or versions.recipe_id = jobs.recipe_id)
        and (jobs.source_kind <> 'shared_platform' or versions.imported_recipe_id = jobs.imported_recipe_id)
      order by versions.created_at desc, versions.id desc
      limit 1
    )
    and (
      (jobs.source_kind = 'household' and exists (
        select 1 from cooksmith.household_recipes recipes
        where recipes.id = jobs.recipe_id and recipes.archived_at is null
      ))
      or
      (jobs.source_kind = 'shared_platform' and exists (
        select 1 from cooksmith.imported_recipes recipes
        where recipes.id = jobs.imported_recipe_id
          and recipes.visibility = 'public' and recipes.archived_at is null
      ))
    );
$$;

revoke all on function cooksmith_private.recipe_enrichment_recoverable_count()
  from public, anon, authenticated;
grant execute on function cooksmith_private.recipe_enrichment_recoverable_count()
  to service_role;

create or replace function cooksmith.recipe_enrichment_backfill_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'paused', settings.backfill_paused,
    'aiEnabled', settings.ai_enabled,
    'monthlyCostLimitAud', settings.monthly_cost_limit_aud,
    'recoverableCount', cooksmith_private.recipe_enrichment_recoverable_count(),
    'sources', jsonb_build_object(
      'household', jsonb_build_object(
        'eligible', (select count(*) from cooksmith.household_recipes where archived_at is null),
        'current', (select count(*) from cooksmith.recipe_enrichments where source_kind = 'household' and is_active)
      ),
      'sharedPlatform', jsonb_build_object(
        'eligible', (select count(*) from cooksmith.imported_recipes where visibility = 'public' and archived_at is null),
        'current', (select count(*) from cooksmith.recipe_enrichments where source_kind = 'shared_platform' and is_active)
      )
    ),
    'states', coalesce((select jsonb_object_agg(state, total) from (
      select state::text, count(*) total
      from cooksmith.recipe_enrichment_jobs
      group by state
    ) counts), '{}'::jsonb),
    'latestProviderFailure', (
      select jsonb_strip_nulls(jsonb_build_object(
        'httpStatus', jobs.provider_http_status,
        'errorCode', jobs.provider_error_code,
        'errorParam', jobs.provider_error_param,
        'requestId', jobs.provider_request_id,
        'failedAt', jobs.updated_at
      ))
      from cooksmith.recipe_enrichment_jobs jobs
      where jobs.model_key = 'provider-assisted-v1'
        and jobs.state = 'failed'
        and jobs.provider_http_status is not null
      order by jobs.updated_at desc, jobs.id desc
      limit 1
    )
  ) into result
  from cooksmith.recipe_intelligence_settings settings
  where settings.singleton;
  return result;
end;
$$;

create or replace function cooksmith.recipe_enrichment_backfill_command(
  command text,
  batch_limit integer default 25
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipe_record record;
  queued integer := 0;
  bounded_limit integer := least(greatest(batch_limit, 1), 100);
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if command not in (
    'start', 'pause', 'resume', 'retry_failed', 'reprocess_ai',
    'recover_exhausted_ai_failures'
  ) then
    raise exception 'invalid_command' using errcode = '22023';
  end if;
  if command in ('reprocess_ai', 'recover_exhausted_ai_failures') and not exists (
    select 1 from cooksmith.recipe_intelligence_settings
    where singleton and ai_enabled and not emergency_stop
  ) then
    raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000';
  end if;

  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
  values (auth.uid(), command);

  if command = 'pause' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = true where singleton;
  elsif command = 'resume' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = false where singleton;
  elsif command = 'retry_failed' then
    update cooksmith.recipe_enrichment_jobs
    set state = 'pending', available_at = now(), failure_category = null
    where id in (
      select id from cooksmith.recipe_enrichment_jobs
      where state = 'failed'
        and model_key = 'provider-assisted-v1'
        and attempt_count < 3
      order by updated_at limit bounded_limit
    );
    get diagnostics queued = row_count;
  elsif command = 'recover_exhausted_ai_failures' then
    update cooksmith.recipe_enrichment_jobs jobs
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
    where jobs.id in (
      select candidates.id
      from cooksmith.recipe_enrichment_jobs candidates
      where candidates.state = 'failed'
        and candidates.model_key = 'provider-assisted-v1'
        and candidates.attempt_count >= 3
        and not exists (
          select 1 from cooksmith.recipe_enrichments active
          where active.is_active and active.recipe_version_id = candidates.recipe_version_id
        )
        and candidates.recipe_version_id = (
          select versions.id
          from cooksmith.recipe_content_versions versions
          where versions.source_kind = candidates.source_kind
            and (candidates.source_kind <> 'household' or versions.recipe_id = candidates.recipe_id)
            and (candidates.source_kind <> 'shared_platform' or versions.imported_recipe_id = candidates.imported_recipe_id)
          order by versions.created_at desc, versions.id desc
          limit 1
        )
        and (
          (candidates.source_kind = 'household' and exists (
            select 1 from cooksmith.household_recipes recipes
            where recipes.id = candidates.recipe_id and recipes.archived_at is null
          ))
          or
          (candidates.source_kind = 'shared_platform' and exists (
            select 1 from cooksmith.imported_recipes recipes
            where recipes.id = candidates.imported_recipe_id
              and recipes.visibility = 'public' and recipes.archived_at is null
          ))
        )
      order by candidates.updated_at, candidates.id
      limit bounded_limit
      for update skip locked
    );
    get diagnostics queued = row_count;
  elsif command = 'reprocess_ai' then
    insert into cooksmith.recipe_enrichment_jobs (
      source_kind, recipe_id, imported_recipe_id, household_id,
      recipe_version_id, schema_version, rules_version, model_key
    )
    select
      versions.source_kind, versions.recipe_id, versions.imported_recipe_id,
      versions.household_id, versions.id,
      'recipe-intelligence-v1', 'cooksmith-rules-v1', 'provider-assisted-v1'
    from cooksmith.recipe_content_versions versions
    where versions.id in (
      select distinct on (source_kind, recipe_id, imported_recipe_id) id
      from cooksmith.recipe_content_versions
      order by source_kind, recipe_id, imported_recipe_id, created_at desc, id desc
    )
    order by versions.created_at
    limit bounded_limit
    on conflict (recipe_version_id, schema_version, rules_version, model_key) do nothing;
    get diagnostics queued = row_count;
  else
    for recipe_record in
      (select 'household'::text source_kind, id from cooksmith.household_recipes
       where archived_at is null order by updated_at limit bounded_limit)
      union all
      (select 'shared_platform', id from cooksmith.imported_recipes
       where visibility = 'public' and archived_at is null order by updated_at limit bounded_limit)
    loop
      if recipe_record.source_kind = 'household' then
        perform cooksmith_private.queue_recipe_enrichment(recipe_record.id);
      else
        perform cooksmith_private.queue_shared_recipe_enrichment(recipe_record.id);
      end if;
      queued := queued + 1;
    end loop;
  end if;

  return jsonb_build_object('queued', queued, 'status', cooksmith.recipe_enrichment_backfill_status());
end;
$$;

comment on function cooksmith.activate_recipe_enrichment(uuid, text, text, jsonb, text) is
  'Atomically validates freshness, activates enrichment, and completes its job.';
comment on function cooksmith_private.reconcile_active_recipe_enrichment_jobs() is
  'Repairs failed-job contradictions only when that job owns the active enrichment.';
comment on function cooksmith_private.recipe_enrichment_recoverable_count() is
  'Counts only exhausted current-version provider jobs without active successful enrichment.';
comment on function cooksmith.recipe_enrichment_backfill_command(text, integer) is
  'Admin-only audited enrichment control, including exact bounded recovery selection.';

commit;
