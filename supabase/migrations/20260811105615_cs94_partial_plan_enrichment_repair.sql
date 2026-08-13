begin;

create or replace function cooksmith.activate_recipe_enrichment(
  target_job_id uuid, target_provider text, target_model_key text,
  target_result jsonb, target_overall_confidence text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  job_record cooksmith.recipe_enrichment_jobs%rowtype;
  enrichment_id uuid;
  current_version_id uuid;
  opportunity_count integer;
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
    where id = job_record.imported_recipe_id and visibility = 'public' and archived_at is null
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

  opportunity_count := case
    when jsonb_typeof(target_result -> 'preparationOpportunities') = 'array'
      then jsonb_array_length(target_result -> 'preparationOpportunities')
    else 0
  end;

  if opportunity_count = 0 then
    select id into enrichment_id from cooksmith.recipe_enrichments
    where recipe_version_id = job_record.recipe_version_id
      and schema_version = job_record.schema_version and rules_version = job_record.rules_version
      and jsonb_typeof(result -> 'preparationOpportunities') = 'array'
      and jsonb_array_length(result -> 'preparationOpportunities') > 0
    order by is_active desc, activated_at desc nulls last, created_at desc limit 1;

    if enrichment_id is not null then
      update cooksmith.recipe_enrichments
      set is_active = false
      where source_kind = job_record.source_kind
        and (job_record.source_kind <> 'household' or recipe_id = job_record.recipe_id)
        and (job_record.source_kind <> 'shared_platform' or imported_recipe_id = job_record.imported_recipe_id);
      update cooksmith.recipe_enrichments
      set is_active = true, activated_at = now()
      where id = enrichment_id;
    elsif job_record.model_key = 'deterministic' then
      insert into cooksmith.recipe_enrichment_jobs (
        source_kind, recipe_id, imported_recipe_id, household_id, recipe_version_id,
        schema_version, rules_version, model_key
      ) values (
        job_record.source_kind, job_record.recipe_id, job_record.imported_recipe_id,
        job_record.household_id, job_record.recipe_version_id, job_record.schema_version,
        job_record.rules_version, 'provider-assisted-v2'
      ) on conflict (recipe_version_id, schema_version, rules_version, model_key)
      do update set state = 'pending', attempt_count = 0, available_at = now(),
        leased_until = null, completed_at = null, failure_category = null,
        provider_http_status = null, provider_error_code = null,
        provider_error_param = null, provider_request_id = null;
    else
      raise exception 'empty_provider_enrichment' using errcode = 'P0001';
    end if;

    update cooksmith.recipe_enrichment_jobs
    set state = 'completed', leased_until = null, completed_at = now(),
      failure_category = null, provider_http_status = null, provider_error_code = null,
      provider_error_param = null, provider_request_id = null
    where id = job_record.id;
    return enrichment_id;
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
  ) on conflict (job_id) do update set provider = excluded.provider,
    model_key = excluded.model_key, result = excluded.result,
    overall_confidence = excluded.overall_confidence, is_active = true,
    activated_at = excluded.activated_at
  returning id into enrichment_id;
  update cooksmith.recipe_enrichment_jobs
  set state = 'completed', leased_until = null, completed_at = now(),
    failure_category = null, provider_http_status = null, provider_error_code = null,
    provider_error_param = null, provider_request_id = null
  where id = job_record.id;
  return enrichment_id;
end;
$$;

create temporary table cs94_enrichment_recovery on commit drop as
  select distinct on (empty_result.recipe_version_id)
    empty_result.id as empty_id, valid_result.id as valid_id
  from cooksmith.recipe_enrichments empty_result
  join cooksmith.recipe_enrichments valid_result
    on valid_result.recipe_version_id = empty_result.recipe_version_id
    and valid_result.schema_version = empty_result.schema_version
    and valid_result.rules_version = empty_result.rules_version
  where empty_result.is_active and empty_result.schema_version = 'recipe-intelligence-v3'
    and empty_result.rules_version = 'cooksmith-rules-v3'
    and jsonb_typeof(empty_result.result -> 'preparationOpportunities') = 'array'
    and jsonb_array_length(empty_result.result -> 'preparationOpportunities') = 0
    and jsonb_typeof(valid_result.result -> 'preparationOpportunities') = 'array'
    and jsonb_array_length(valid_result.result -> 'preparationOpportunities') > 0
  order by empty_result.recipe_version_id, valid_result.activated_at desc nulls last,
    valid_result.created_at desc;

update cooksmith.recipe_enrichments enrichment set is_active = false
from cs94_enrichment_recovery recoverable where enrichment.id = recoverable.empty_id;
update cooksmith.recipe_enrichments enrichment set is_active = true, activated_at = now()
from cs94_enrichment_recovery recoverable where enrichment.id = recoverable.valid_id;

insert into cooksmith.recipe_enrichment_jobs (
  source_kind, recipe_id, imported_recipe_id, household_id, recipe_version_id,
  schema_version, rules_version, model_key
)
select enrichment.source_kind, enrichment.recipe_id, enrichment.imported_recipe_id,
  enrichment.household_id, enrichment.recipe_version_id, enrichment.schema_version,
  enrichment.rules_version, 'provider-assisted-v2'
from cooksmith.recipe_enrichments enrichment
where enrichment.is_active and enrichment.schema_version = 'recipe-intelligence-v3'
  and enrichment.rules_version = 'cooksmith-rules-v3'
  and jsonb_typeof(enrichment.result -> 'preparationOpportunities') = 'array'
  and jsonb_array_length(enrichment.result -> 'preparationOpportunities') = 0
on conflict (recipe_version_id, schema_version, rules_version, model_key)
do update set state = 'pending', attempt_count = 0, available_at = now(),
  leased_until = null, completed_at = null, failure_category = null,
  provider_http_status = null, provider_error_code = null,
  provider_error_param = null, provider_request_id = null;

comment on function cooksmith.activate_recipe_enrichment(uuid, text, text, jsonb, text) is
  'Activates usable enrichment, preserves a prior usable result over an empty regression, and queues provider repair for empty deterministic results.';

commit;
