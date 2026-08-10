begin;

-- Provider-assisted v3 results with no preparation opportunities were previously
-- recorded as successful. Release those current jobs back to the durable worker so
-- the corrected provider contract can replace the unusable active enrichment.
update cooksmith.recipe_enrichment_jobs jobs
set
  state = 'pending',
  attempt_count = 0,
  available_at = now(),
  leased_until = null,
  completed_at = null,
  failure_category = null,
  provider_http_status = null,
  provider_error_code = null,
  provider_error_param = null,
  provider_request_id = null,
  latency_ms = null,
  input_tokens = null,
  output_tokens = null,
  estimated_cost_aud = null
where jobs.model_key in ('provider-assisted-v1', 'provider-assisted-v2')
  and jobs.schema_version = 'recipe-intelligence-v3'
  and jobs.rules_version = 'cooksmith-rules-v3'
  and jobs.state = 'completed'
  and jobs.recipe_version_id = (
    select versions.id
    from cooksmith.recipe_content_versions versions
    where versions.source_kind = jobs.source_kind
      and (jobs.source_kind <> 'household' or versions.recipe_id = jobs.recipe_id)
      and (
        jobs.source_kind <> 'shared_platform'
        or versions.imported_recipe_id = jobs.imported_recipe_id
      )
    order by versions.created_at desc, versions.id desc
    limit 1
  )
  and exists (
    select 1
    from cooksmith.recipe_enrichments enrichment
    where enrichment.recipe_version_id = jobs.recipe_version_id
      and enrichment.is_active
      and enrichment.schema_version = 'recipe-intelligence-v3'
      and enrichment.rules_version = 'cooksmith-rules-v3'
      and jsonb_typeof(enrichment.result -> 'preparationOpportunities') = 'array'
      and jsonb_array_length(enrichment.result -> 'preparationOpportunities') = 0
  );

comment on function cooksmith_private.weekly_preparation_recipes_ready() is
  'Release gate requiring every current recipe to have bounded v3 preparation opportunities or a genuine terminal unsupported-data outcome, with no unfinished v3 jobs.';

commit;
