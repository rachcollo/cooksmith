begin;

create or replace function cooksmith_private.clear_recipe_provider_diagnostics()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.state <> 'failed' then
    new.provider_http_status := null;
    new.provider_error_code := null;
    new.provider_error_param := null;
    new.provider_request_id := null;
  end if;
  return new;
end;
$$;

create trigger clear_recipe_provider_diagnostics
before insert or update of state on cooksmith.recipe_enrichment_jobs
for each row
execute function cooksmith_private.clear_recipe_provider_diagnostics();

create or replace function cooksmith.recipe_enrichment_backfill_status()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'paused', (select backfill_paused from cooksmith.recipe_intelligence_settings where singleton),
    'aiEnabled', (select ai_enabled from cooksmith.recipe_intelligence_settings where singleton),
    'monthlyCostLimitAud', (
      select monthly_cost_limit_aud
      from cooksmith.recipe_intelligence_settings
      where singleton
    ),
    'sources', jsonb_build_object(
      'household', jsonb_build_object(
        'eligible', (select count(*) from cooksmith.household_recipes where archived_at is null),
        'current', (
          select count(*)
          from cooksmith.recipe_enrichments
          where source_kind = 'household' and is_active
        )
      ),
      'sharedPlatform', jsonb_build_object(
        'eligible', (
          select count(*)
          from cooksmith.imported_recipes
          where visibility = 'public' and archived_at is null
        ),
        'current', (
          select count(*)
          from cooksmith.recipe_enrichments
          where source_kind = 'shared_platform' and is_active
        )
      )
    ),
    'states', coalesce((
      select jsonb_object_agg(state, total)
      from (
        select state::text, count(*) total
        from cooksmith.recipe_enrichment_jobs
        group by state
      ) counts
    ), '{}'::jsonb),
    'latestProviderFailure', (
      select case
        when jobs.state = 'failed' and jobs.provider_http_status is not null
        then jsonb_strip_nulls(jsonb_build_object(
          'httpStatus', jobs.provider_http_status,
          'errorCode', jobs.provider_error_code,
          'errorParam', jobs.provider_error_param,
          'requestId', jobs.provider_request_id,
          'failedAt', jobs.updated_at
        ))
        else null
      end
      from cooksmith.recipe_enrichment_jobs jobs
      where jobs.model_key = 'provider-assisted-v1'
      order by jobs.updated_at desc, jobs.id desc
      limit 1
    )
  ) into result;

  return result;
end;
$$;

comment on function cooksmith_private.clear_recipe_provider_diagnostics() is
  'Clears obsolete provider diagnostics whenever an enrichment job leaves failed state.';
comment on function cooksmith.recipe_enrichment_backfill_status() is
  'Admin-only enrichment status; provider diagnostics appear only when the latest AI job is failed.';

commit;
