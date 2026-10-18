begin;

-- Dedicated request identity is both an audit record and a queue reservation.
-- Infinity protects reservations even while the previous worker is deployed.
alter table cooksmith.recipe_enrichment_jobs
  add column repair_request_id uuid unique,
  add column repair_actor_id uuid references auth.users(id) on delete restrict,
  add constraint recipe_enrichment_repair_identity_check check (
    (repair_request_id is null and repair_actor_id is null)
    or (repair_request_id is not null and repair_actor_id is not null
      and model_key = 'admin-repair:' || repair_request_id::text)
  );
create index recipe_enrichment_repair_actor_idx
  on cooksmith.recipe_enrichment_jobs(repair_actor_id) where repair_actor_id is not null;

-- A private definer is necessary for admin operational metadata across sources.
-- It never returns source text or household identity.
create function cooksmith_private.admin_recipe_repair_inspect(
  target_recipe_id uuid, target_source_kind cooksmith.recipe_enrichment_source
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from cooksmith.admin_recipe_enrichment_list(null, null) r
    where r.recipe_id = target_recipe_id and r.source_kind = target_source_kind
  ) then raise exception 'recipe_unavailable' using errcode = '22023'; end if;
  select jsonb_build_object(
    'rulesVersion', 'cooksmith-rules-v4',
    'currentRules', exists(select 1 from cooksmith.recipe_enrichments e
      where e.recipe_version_id = v.id and e.is_active
        and e.schema_version = 'recipe-intelligence-v3' and e.rules_version = 'cooksmith-rules-v4'
        and e.provider <> 'deterministic'),
    'enabled', s.ai_enabled and s.enqueue_enabled and not s.emergency_stop and not s.backfill_paused,
    'failureCategory', j.failure_category,
    'repair', case when repair.id is null then null else jsonb_build_object(
      'jobId', repair.id, 'state', repair.state,
      'failureCategory', repair.failure_category,
      'estimatedCostAud', repair.estimated_cost_aud,
      'providerStarted', repair.provider_started_at is not null,
      'createdAt', repair.created_at,
      'leaseExpired', repair.state = 'processing' and repair.leased_until <= now()
    ) end
  ) into result
  from cooksmith.recipe_intelligence_settings s
  left join lateral (
    select id from cooksmith.recipe_content_versions
    where source_kind = target_source_kind
      and (recipe_id = target_recipe_id or imported_recipe_id = target_recipe_id)
    order by created_at desc, id desc limit 1
  ) v on true
  left join lateral (
    select failure_category from cooksmith.recipe_enrichment_jobs
    where recipe_version_id = v.id and model_key <> 'deterministic'
    order by created_at desc, id desc limit 1
  ) j on true
  left join lateral (
    select * from cooksmith.recipe_enrichment_jobs
    where source_kind = target_source_kind and repair_request_id is not null
      and (recipe_id = target_recipe_id or imported_recipe_id = target_recipe_id)
    order by created_at desc, id desc limit 1
  ) repair on true
  where s.singleton;
  return result;
end;
$$;

create function cooksmith_private.admin_recipe_repair_prepare(
  target_recipe_id uuid, target_source_kind cooksmith.recipe_enrichment_source, request_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  recipe_record cooksmith.household_recipes%rowtype;
  shared_record cooksmith.imported_recipes%rowtype;
  snapshot jsonb;
  version_id uuid;
  job_record cooksmith.recipe_enrichment_jobs%rowtype;
  job_id uuid;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if request_id is null or target_recipe_id is null or target_source_kind is null then
    raise exception 'invalid_request' using errcode = '22023';
  end if;
  -- Serialise reservations and claims with the same settings lock.
  perform 1 from cooksmith.recipe_intelligence_settings where singleton for update;
  select * into job_record from cooksmith.recipe_enrichment_jobs where repair_request_id = request_id;
  if found then
    if job_record.repair_actor_id <> auth.uid() or job_record.source_kind <> target_source_kind
      or coalesce(job_record.recipe_id, job_record.imported_recipe_id) <> target_recipe_id then
      raise exception 'request_mismatch' using errcode = '22023';
    end if;
    return job_record.id;
  end if;
  if not exists (select 1 from cooksmith.recipe_intelligence_settings
    where singleton and ai_enabled and enqueue_enabled and not emergency_stop and not backfill_paused)
  then raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000'; end if;
  -- Never overlap a repair or conceal unknown spend from an earlier attempt.
  if exists(select 1 from cooksmith.recipe_enrichment_jobs
    where source_kind = target_source_kind
      and (recipe_id = target_recipe_id or imported_recipe_id = target_recipe_id)
      and (state = 'processing' or (repair_request_id is not null and
        (state = 'pending' or (provider_started_at is not null and estimated_cost_aud is null))))) then
    raise exception 'repair_needs_review' using errcode = '55000';
  end if;
  if target_source_kind = 'household' then
    select * into recipe_record from cooksmith.household_recipes
      where id = target_recipe_id and archived_at is null for share;
    if not found then raise exception 'recipe_unavailable' using errcode = '22023'; end if;
  snapshot := jsonb_build_object(
    'recipe', jsonb_build_object(
      'id', recipe_record.id,
      'name', recipe_record.name,
      'servings', recipe_record.servings,
      'prepTimeMinutes', recipe_record.prep_time_minutes,
      'cookTimeMinutes', recipe_record.cook_time_minutes
    ),
    'ingredients', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ingredient.id,
        'name', ingredient.ingredient_name,
        'originalText', ingredient.original_line_text,
        'quantityText', ingredient.quantity_text,
        'unit', ingredient.unit,
        'preparation', ingredient.preparation
      ) order by ingredient.position)
      from cooksmith.recipe_ingredients ingredient
      where ingredient.recipe_id = target_recipe_id
    ), '[]'::jsonb),
    'steps', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', step.id,
        'instruction', step.original_line_text
      ) order by step.position)
      from cooksmith.recipe_steps step
      where step.recipe_id = target_recipe_id
    ), '[]'::jsonb)
  );

  else
    select * into shared_record from cooksmith.imported_recipes
      where id = target_recipe_id and visibility = 'public' and archived_at is null for share;
    if not found then raise exception 'recipe_unavailable' using errcode = '22023'; end if;
    snapshot := jsonb_build_object(
      'recipe', jsonb_build_object('id', shared_record.id, 'name', shared_record.name,
        'servings', shared_record.servings, 'prepTimeMinutes', shared_record.prep_time_minutes,
        'cookTimeMinutes', shared_record.cook_time_minutes),
      'ingredients', shared_record.ingredient_rows, 'steps', shared_record.instruction_steps);
  end if;
  select id into version_id from cooksmith.recipe_content_versions
    where source_kind = target_source_kind
      and (recipe_id = target_recipe_id or imported_recipe_id = target_recipe_id)
      and fingerprint = md5(snapshot::text);
  if version_id is null then
    insert into cooksmith.recipe_content_versions
      (source_kind, recipe_id, imported_recipe_id, household_id, fingerprint, source_snapshot)
    values (target_source_kind, recipe_record.id, shared_record.id, recipe_record.household_id,
      md5(snapshot::text), snapshot) returning id into version_id;
  end if;
  insert into cooksmith.recipe_enrichment_jobs
    (source_kind, recipe_id, imported_recipe_id, household_id, recipe_version_id,
     schema_version, rules_version, model_key, repair_request_id, repair_actor_id, available_at)
  values (target_source_kind, recipe_record.id, shared_record.id, recipe_record.household_id,
    version_id, 'recipe-intelligence-v3', 'cooksmith-rules-v4', 'admin-repair:' || request_id::text,
    request_id, auth.uid(), 'infinity') returning id into job_id;
  return job_id;
end;
$$;

create function cooksmith_private.admin_recipe_repair_claim(target_job_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  config cooksmith.recipe_intelligence_settings%rowtype;
  job cooksmith.recipe_enrichment_jobs%rowtype;
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into config from cooksmith.recipe_intelligence_settings where singleton for update;
  if not config.ai_enabled or not config.enqueue_enabled or config.emergency_stop or config.backfill_paused
    then raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000'; end if;
  select * into job from cooksmith.recipe_enrichment_jobs
    where id = target_job_id and repair_request_id is not null for update;
  if job.id is null then raise exception 'repair_unavailable' using errcode = '22023'; end if;
  if job.state <> 'pending' or job.attempt_count <> 0 then return null; end if;
  if not exists (
    select 1 from cooksmith.admin_recipe_enrichment_list(null, null) r
    where r.source_kind = job.source_kind and r.recipe_id = coalesce(job.recipe_id, job.imported_recipe_id)
  ) or job.recipe_version_id is distinct from (
    select v.id from cooksmith.recipe_content_versions v
    where v.source_kind = job.source_kind
      and (v.recipe_id = job.recipe_id or v.imported_recipe_id = job.imported_recipe_id)
    order by v.created_at desc, v.id desc limit 1
  ) then
    update cooksmith.recipe_enrichment_jobs set state = 'cancelled',
      failure_category = 'stale_version', estimated_cost_aud = 0
      where id = job.id;
    return null;
  end if;
  if (select count(*) from cooksmith.recipe_enrichment_jobs
      where state = 'processing' and leased_until > now()) >= config.max_concurrency
    then raise exception 'worker_busy' using errcode = '55000'; end if;
  if (select count(*) from cooksmith.recipe_enrichment_jobs
      where provider_started_at >= date_trunc('day', now())) >= config.daily_recipe_limit
    or (select coalesce(sum(estimated_cost_aud), 0) from cooksmith.recipe_enrichment_jobs
      where provider_started_at >= date_trunc('month', now())) >= config.monthly_cost_limit_aud
    then raise exception 'usage_limit' using errcode = '55000'; end if;
  update cooksmith.recipe_enrichment_jobs set state = 'processing', attempt_count = 1,
    leased_until = now() + interval '130 seconds', provider_started_at = now()
    where id = job.id returning * into job;
  return jsonb_build_object('id', job.id, 'source_kind', job.source_kind,
    'recipe_id', job.recipe_id, 'imported_recipe_id', job.imported_recipe_id,
    'recipe_version_id', job.recipe_version_id, 'attempt_count', job.attempt_count,
    'model_key', job.model_key);
end;
$$;

create function cooksmith.admin_recipe_repair_inspect(target_recipe_id uuid, target_source_kind cooksmith.recipe_enrichment_source) returns jsonb
language sql security invoker set search_path = '' as $$
  select cooksmith_private.admin_recipe_repair_inspect(target_recipe_id, target_source_kind);
$$;
revoke all on function cooksmith_private.admin_recipe_repair_inspect(uuid, cooksmith.recipe_enrichment_source) from public, anon;
revoke all on function cooksmith.admin_recipe_repair_inspect(uuid, cooksmith.recipe_enrichment_source) from public, anon;
grant execute on function cooksmith_private.admin_recipe_repair_inspect(uuid, cooksmith.recipe_enrichment_source) to authenticated;
grant execute on function cooksmith.admin_recipe_repair_inspect(uuid, cooksmith.recipe_enrichment_source) to authenticated;

create function cooksmith.admin_recipe_repair_prepare(target_recipe_id uuid, target_source_kind cooksmith.recipe_enrichment_source, request_id uuid) returns uuid
language sql security invoker set search_path = '' as $$
  select cooksmith_private.admin_recipe_repair_prepare(target_recipe_id, target_source_kind, request_id);
$$;
revoke all on function cooksmith_private.admin_recipe_repair_prepare(uuid, cooksmith.recipe_enrichment_source, uuid) from public, anon;
revoke all on function cooksmith.admin_recipe_repair_prepare(uuid, cooksmith.recipe_enrichment_source, uuid) from public, anon;
grant execute on function cooksmith_private.admin_recipe_repair_prepare(uuid, cooksmith.recipe_enrichment_source, uuid) to authenticated;
grant execute on function cooksmith.admin_recipe_repair_prepare(uuid, cooksmith.recipe_enrichment_source, uuid) to authenticated;

create function cooksmith.admin_recipe_repair_claim(target_job_id uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select cooksmith_private.admin_recipe_repair_claim(target_job_id);
$$;
revoke all on function cooksmith_private.admin_recipe_repair_claim(uuid) from public, anon;
revoke all on function cooksmith.admin_recipe_repair_claim(uuid) from public, anon;
grant execute on function cooksmith_private.admin_recipe_repair_claim(uuid) to authenticated;
grant execute on function cooksmith.admin_recipe_repair_claim(uuid) to authenticated;

commit;
