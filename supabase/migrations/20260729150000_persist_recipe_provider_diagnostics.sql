begin;

alter table cooksmith.recipe_enrichment_jobs
  add column provider_http_status smallint,
  add column provider_error_code text,
  add column provider_error_param text,
  add column provider_request_id text,
  add constraint recipe_enrichment_jobs_provider_http_status_valid check (
    provider_http_status is null or provider_http_status between 400 and 599
  ),
  add constraint recipe_enrichment_jobs_provider_error_code_valid check (
    provider_error_code is null
    or (
      char_length(provider_error_code) between 1 and 80
      and provider_error_code ~ '^[A-Za-z0-9_.-]+$'
    )
  ),
  add constraint recipe_enrichment_jobs_provider_error_param_valid check (
    provider_error_param is null
    or (
      char_length(provider_error_param) between 1 and 160
      and provider_error_param ~ '^[A-Za-z0-9_.-]+$'
    )
  ),
  add constraint recipe_enrichment_jobs_provider_request_id_valid check (
    provider_request_id is null
    or (
      char_length(provider_request_id) between 1 and 100
      and provider_request_id ~ '^[A-Za-z0-9_-]+$'
    )
  );

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
      select jsonb_strip_nulls(jsonb_build_object(
        'httpStatus', jobs.provider_http_status,
        'errorCode', jobs.provider_error_code,
        'errorParam', jobs.provider_error_param,
        'requestId', jobs.provider_request_id,
        'failedAt', jobs.updated_at
      ))
      from cooksmith.recipe_enrichment_jobs jobs
      where jobs.state = 'failed'
        and jobs.model_key = 'provider-assisted-v1'
        and jobs.provider_http_status is not null
      order by jobs.updated_at desc, jobs.id desc
      limit 1
    )
  ) into result;

  return result;
end;
$$;

comment on column cooksmith.recipe_enrichment_jobs.provider_http_status is
  'Privacy-safe HTTP status returned by the provider for the latest failed attempt.';
comment on column cooksmith.recipe_enrichment_jobs.provider_error_code is
  'Allow-listed provider error code for diagnostics; never stores provider messages or recipe data.';
comment on column cooksmith.recipe_enrichment_jobs.provider_error_param is
  'Allow-listed rejected request parameter for diagnostics; never stores request values.';
comment on column cooksmith.recipe_enrichment_jobs.provider_request_id is
  'Allow-listed provider request identifier for support correlation.';
comment on function cooksmith.recipe_enrichment_backfill_status() is
  'Admin-only Recipe Intelligence status with privacy-safe provider failure diagnostics.';

commit;
