begin;

alter table cooksmith.recipe_enrichment_jobs
  add column provider_started_at timestamptz;

update cooksmith.recipe_enrichment_jobs
set provider_started_at = updated_at
where model_key <> 'deterministic'
  and attempt_count > 0
  and updated_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC';

create index recipe_enrichment_jobs_provider_started_idx
  on cooksmith.recipe_enrichment_jobs (provider_started_at)
  where model_key <> 'deterministic' and provider_started_at is not null;

alter table cooksmith.recipe_intelligence_settings
  alter column daily_recipe_limit set default 100;

update cooksmith.recipe_intelligence_settings
set daily_recipe_limit = 100
where singleton = true;

alter table cooksmith.recipe_enrichment_backfill_audit
  drop constraint recipe_enrichment_backfill_audit_action_check,
  add constraint recipe_enrichment_backfill_audit_action_check
    check (action in (
      'start', 'pause', 'resume', 'retry_failed',
      'enable_ai', 'disable_ai', 'reprocess_ai',
      'recover_exhausted_ai_failures', 'update_daily_limit'
    ));

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
      select count(*)
      from cooksmith.recipe_enrichment_jobs jobs
      where jobs.model_key <> 'deterministic'
        and jobs.provider_started_at >=
          date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
    ),
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

create function cooksmith.recipe_intelligence_daily_limit_command(
  target_daily_recipe_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if target_daily_recipe_limit is null
    or target_daily_recipe_limit < 0
    or target_daily_recipe_limit > 10000 then
    raise exception 'invalid_daily_recipe_limit' using errcode = '22023';
  end if;

  update cooksmith.recipe_intelligence_settings
  set daily_recipe_limit = target_daily_recipe_limit
  where singleton = true;

  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
  values (auth.uid(), 'update_daily_limit');

  return cooksmith.recipe_enrichment_backfill_status();
end;
$$;

revoke all on function cooksmith.recipe_intelligence_daily_limit_command(integer)
  from public, anon;
grant execute on function cooksmith.recipe_intelligence_daily_limit_command(integer)
  to authenticated;

comment on function cooksmith.recipe_intelligence_daily_limit_command(integer) is
  'Audited admin-only control for the daily count of provider-assisted recipe jobs that may start.';

commit;
