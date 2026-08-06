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
  select coalesce(bool_and(
    (
      exists (
        select 1 from cooksmith.recipe_enrichments enrichment
        where enrichment.recipe_version_id = latest_versions.id
          and enrichment.is_active
          and enrichment.schema_version = 'recipe-intelligence-v3'
          and enrichment.rules_version = 'cooksmith-rules-v3'
          and jsonb_typeof(enrichment.result -> 'preparationOpportunities') = 'array'
          and jsonb_array_length(enrichment.result -> 'preparationOpportunities') > 0
          and not exists (
            select 1
            from jsonb_array_elements(enrichment.result -> 'preparationOpportunities') opportunity
            where not (
              opportunity ? 'kind'
              and opportunity ? 'ingredientLines'
              and opportunity ? 'instructionSteps'
              and opportunity ? 'stoppingPoint'
              and opportunity ? 'storageGuidance'
              and opportunity ? 'finishingGuidance'
            )
          )
      )
      or exists (
        select 1 from cooksmith.recipe_enrichment_jobs job
        where job.recipe_version_id = latest_versions.id
          and job.schema_version = 'recipe-intelligence-v3'
          and job.rules_version = 'cooksmith-rules-v3'
          and job.state = 'failed'
          and job.failure_category = 'unsupported_data'
      )
    )
    and not exists (
      select 1 from cooksmith.recipe_enrichment_jobs job
      where job.recipe_version_id = latest_versions.id
        and job.schema_version = 'recipe-intelligence-v3'
        and job.rules_version = 'cooksmith-rules-v3'
        and job.state in ('pending', 'processing')
    )
  ), true)
  from latest_versions;
$$;

create or replace function cooksmith_private.weekly_preparation_enrichment_settled()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (
    select 1
    from cooksmith.recipe_enrichment_jobs jobs
    where jobs.schema_version = 'recipe-intelligence-v3'
      and jobs.rules_version = 'cooksmith-rules-v3'
      and jobs.state in ('pending', 'processing')
  );
$$;

create or replace function cooksmith.weekly_preparation_recipe_readiness()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select cooksmith_private.weekly_preparation_enrichment_settled();
$$;

revoke all on function cooksmith_private.weekly_preparation_enrichment_settled()
  from public, anon, authenticated;
grant execute on function cooksmith_private.weekly_preparation_enrichment_settled()
  to service_role;
revoke all on function cooksmith.weekly_preparation_recipe_readiness()
  from public, anon, authenticated;
grant execute on function cooksmith.weekly_preparation_recipe_readiness()
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
    'dailyRecipeLimit', settings.daily_recipe_limit,
    'dailyProcessedCount', (
      select count(*) from cooksmith.recipe_enrichment_jobs jobs
      where jobs.model_key <> 'deterministic'
        and jobs.provider_started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
    ),
    'monthlyCostLimitAud', settings.monthly_cost_limit_aud,
    'recoverableCount', cooksmith_private.recipe_enrichment_recoverable_count(),
    'terminalUnsupportedCount', (
      select count(*) from cooksmith.recipe_enrichment_jobs jobs
      where jobs.schema_version = 'recipe-intelligence-v3'
        and jobs.rules_version = 'cooksmith-rules-v3'
        and jobs.state = 'failed' and jobs.failure_category = 'unsupported_data'
    ),
    'evaluationReady', cooksmith_private.weekly_preparation_enrichment_settled(),
    'recipesReady', cooksmith_private.weekly_preparation_recipes_ready(),
    'sources', jsonb_build_object(
      'household', jsonb_build_object(
        'eligible', (select count(*) from cooksmith.household_recipes where archived_at is null),
        'current', (select count(*) from cooksmith.recipe_enrichments where source_kind = 'household' and is_active and schema_version = 'recipe-intelligence-v3' and rules_version = 'cooksmith-rules-v3')
      ),
      'sharedPlatform', jsonb_build_object(
        'eligible', (select count(*) from cooksmith.imported_recipes where visibility = 'public' and archived_at is null),
        'current', (select count(*) from cooksmith.recipe_enrichments where source_kind = 'shared_platform' and is_active and schema_version = 'recipe-intelligence-v3' and rules_version = 'cooksmith-rules-v3')
      )
    ),
    'states', coalesce((select jsonb_object_agg(state, total) from (
      select state::text, count(*) total
      from cooksmith.recipe_enrichment_jobs
      where schema_version = 'recipe-intelligence-v3' and rules_version = 'cooksmith-rules-v3'
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
        and jobs.schema_version = 'recipe-intelligence-v3'
        and jobs.rules_version = 'cooksmith-rules-v3'
        and jobs.state = 'failed' and jobs.provider_http_status is not null
      order by jobs.updated_at desc, jobs.id desc limit 1
    )
  ) into result
  from cooksmith.recipe_intelligence_settings settings where settings.singleton;
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
  requeued integer := 0;
  bounded_limit integer := least(greatest(batch_limit, 1), 100);
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if command not in ('start', 'pause', 'resume', 'retry_failed', 'reprocess_ai', 'recover_exhausted_ai_failures') then
    raise exception 'invalid_command' using errcode = '22023';
  end if;
  if command in ('reprocess_ai', 'recover_exhausted_ai_failures') and not exists (
    select 1 from cooksmith.recipe_intelligence_settings where singleton and ai_enabled and not emergency_stop
  ) then
    raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000';
  end if;

  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action) values (auth.uid(), command);

  if command = 'pause' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = true where singleton;
  elsif command = 'resume' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = false where singleton;
  elsif command = 'retry_failed' then
    update cooksmith.recipe_enrichment_jobs jobs
    set state = 'pending', available_at = now(), leased_until = null, completed_at = null,
        failure_category = null, provider_http_status = null, provider_error_code = null,
        provider_error_param = null, provider_request_id = null
    where jobs.id in (
      select candidates.id from cooksmith.recipe_enrichment_jobs candidates
      where candidates.state = 'failed'
        and candidates.schema_version = 'recipe-intelligence-v3'
        and candidates.rules_version = 'cooksmith-rules-v3'
        and candidates.model_key = 'provider-assisted-v1'
        and candidates.attempt_count < 3
        and candidates.failure_category <> 'unsupported_data'
        and candidates.recipe_version_id = (
          select versions.id from cooksmith.recipe_content_versions versions
          where versions.source_kind = candidates.source_kind
            and (candidates.source_kind <> 'household' or versions.recipe_id = candidates.recipe_id)
            and (candidates.source_kind <> 'shared_platform' or versions.imported_recipe_id = candidates.imported_recipe_id)
          order by versions.created_at desc, versions.id desc limit 1
        )
        and candidates.recipe_version_id = (
          select versions.id from cooksmith.recipe_content_versions versions
          where versions.source_kind = candidates.source_kind
            and (candidates.source_kind <> 'household' or versions.recipe_id = candidates.recipe_id)
            and (candidates.source_kind <> 'shared_platform' or versions.imported_recipe_id = candidates.imported_recipe_id)
          order by versions.created_at desc, versions.id desc limit 1
        )
      order by candidates.updated_at, candidates.id
      limit bounded_limit for update skip locked
    );
    get diagnostics queued = row_count;
  elsif command = 'reprocess_ai' then
    insert into cooksmith.recipe_enrichment_jobs (
      source_kind, recipe_id, imported_recipe_id, household_id,
      recipe_version_id, schema_version, rules_version, model_key
    )
    select versions.source_kind, versions.recipe_id, versions.imported_recipe_id,
      versions.household_id, versions.id,
      'recipe-intelligence-v3', 'cooksmith-rules-v3', 'provider-assisted-v1'
    from cooksmith.recipe_content_versions versions
    where versions.id in (
      select distinct on (source_kind, recipe_id, imported_recipe_id) id
      from cooksmith.recipe_content_versions
      order by source_kind, recipe_id, imported_recipe_id, created_at desc, id desc
    )
      and (
        (versions.source_kind = 'household' and exists (
          select 1 from cooksmith.household_recipes recipe
          where recipe.id = versions.recipe_id and recipe.archived_at is null
        )) or
        (versions.source_kind = 'shared_platform' and exists (
          select 1 from cooksmith.imported_recipes recipe
          where recipe.id = versions.imported_recipe_id
            and recipe.visibility = 'public' and recipe.archived_at is null
        ))
      )
    order by versions.created_at, versions.id
    limit bounded_limit
    on conflict (recipe_version_id, schema_version, rules_version, model_key) do nothing;
    get diagnostics queued = row_count;

    update cooksmith.recipe_enrichment_jobs jobs
    set state = 'pending', available_at = now(), leased_until = null, completed_at = null,
        failure_category = null, provider_http_status = null, provider_error_code = null,
        provider_error_param = null, provider_request_id = null
    where jobs.id in (
      select candidates.id from cooksmith.recipe_enrichment_jobs candidates
      where candidates.state = 'failed'
        and candidates.schema_version = 'recipe-intelligence-v3'
        and candidates.rules_version = 'cooksmith-rules-v3'
        and candidates.model_key = 'provider-assisted-v1'
        and candidates.attempt_count < 3
        and candidates.failure_category <> 'unsupported_data'
      order by candidates.updated_at, candidates.id
      limit greatest(bounded_limit - queued, 0) for update skip locked
    );
    get diagnostics requeued = row_count;
    queued := queued + requeued;
  elsif command = 'recover_exhausted_ai_failures' then
    update cooksmith.recipe_enrichment_jobs jobs
    set state = 'pending', attempt_count = 0, available_at = now(), leased_until = null,
        completed_at = null, failure_category = null, provider_http_status = null,
        provider_error_code = null, provider_error_param = null, provider_request_id = null
    where jobs.id in (
      select candidates.id from cooksmith.recipe_enrichment_jobs candidates
      where candidates.state = 'failed'
        and candidates.schema_version = 'recipe-intelligence-v3'
        and candidates.rules_version = 'cooksmith-rules-v3'
        and candidates.model_key = 'provider-assisted-v1'
        and candidates.attempt_count >= 3
        and candidates.failure_category <> 'unsupported_data'
        and candidates.recipe_version_id = (
          select versions.id from cooksmith.recipe_content_versions versions
          where versions.source_kind = candidates.source_kind
            and (candidates.source_kind <> 'household' or versions.recipe_id = candidates.recipe_id)
            and (candidates.source_kind <> 'shared_platform' or versions.imported_recipe_id = candidates.imported_recipe_id)
          order by versions.created_at desc, versions.id desc limit 1
        )
      order by candidates.updated_at, candidates.id
      limit bounded_limit for update skip locked
    );
    get diagnostics queued = row_count;
  else
    for recipe_record in
      (select 'household'::text source_kind, id from cooksmith.household_recipes where archived_at is null order by updated_at limit bounded_limit)
      union all
      (select 'shared_platform', id from cooksmith.imported_recipes where visibility = 'public' and archived_at is null order by updated_at limit bounded_limit)
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

comment on function cooksmith_private.weekly_preparation_recipes_ready() is
  'Release gate requiring every current recipe to have bounded v3 opportunities or a terminal unsupported-data outcome, with no unfinished v3 jobs.';
comment on function cooksmith_private.weekly_preparation_enrichment_settled() is
  'Evaluation gate requiring current v3 enrichment work to reach a terminal state without treating recipe-level failures as a corpus-evaluation failure.';
comment on function cooksmith.weekly_preparation_recipe_readiness() is
  'Service-only evaluation readiness: true when no current v3 enrichment jobs remain pending or processing.';
comment on function cooksmith.recipe_enrichment_backfill_status() is
  'Admin-only current-v3 enrichment progress, terminal unsupported count and weekly-preparation readiness.';
comment on function cooksmith.recipe_enrichment_backfill_command(text, integer) is
  'Admin-only current-v3 enrichment controls; retry releases all selected recoverable blockers and never retries terminal unsupported data.';

commit;
