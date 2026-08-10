begin;

create or replace function cooksmith.activate_recipe_enrichment(
  target_job_id uuid, target_provider text, target_model_key text,
  target_result jsonb, target_overall_confidence text
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
  select * into job_record from cooksmith.recipe_enrichment_jobs
  where id = target_job_id for update;

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

  select id into current_version_id from cooksmith.recipe_content_versions
  where source_kind = job_record.source_kind
    and (job_record.source_kind <> 'household' or recipe_id = job_record.recipe_id)
    and (job_record.source_kind <> 'shared_platform' or imported_recipe_id = job_record.imported_recipe_id)
  order by created_at desc, id desc limit 1;

  if current_version_id is distinct from job_record.recipe_version_id then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;

  update cooksmith.recipe_enrichments set is_active = false
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
  )
  on conflict (job_id) do update set
    provider = excluded.provider,
    model_key = excluded.model_key,
    result = excluded.result,
    overall_confidence = excluded.overall_confidence,
    is_active = true,
    activated_at = excluded.activated_at
  returning id into enrichment_id;

  update cooksmith.recipe_enrichment_jobs
  set state = 'completed', leased_until = null, completed_at = now(),
      failure_category = null, provider_http_status = null,
      provider_error_code = null, provider_error_param = null,
      provider_request_id = null
  where id = job_record.id;

  return enrichment_id;
end;
$$;

comment on function cooksmith.activate_recipe_enrichment(uuid, text, text, jsonb, text) is
  'Atomically activates a recipe enrichment and completes its job, replacing the prior result when the same durable job is intentionally reprocessed.';

commit;
