begin;

create schema if not exists cooksmith_private;
revoke all on schema cooksmith_private from public, anon, authenticated;
grant usage on schema cooksmith_private to authenticated;

create type cooksmith.recipe_enrichment_job_state as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type cooksmith.recipe_enrichment_failure_category as enum (
  'disabled',
  'timeout',
  'usage_limit',
  'transient_provider',
  'permanent_provider',
  'schema_invalid',
  'unsupported_data',
  'stale_version',
  'internal_validation'
);

create table cooksmith.recipe_content_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references cooksmith.household_recipes(id) on delete cascade,
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  fingerprint text not null,
  source_snapshot jsonb not null,
  created_at timestamptz not null default now(),
  constraint recipe_content_versions_identity_unique unique (recipe_id, fingerprint),
  constraint recipe_content_versions_fingerprint_format check (fingerprint ~ '^[a-f0-9]{32}$'),
  constraint recipe_content_versions_snapshot_object check (jsonb_typeof(source_snapshot) = 'object')
);

create table cooksmith.recipe_enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references cooksmith.household_recipes(id) on delete cascade,
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  recipe_version_id uuid not null references cooksmith.recipe_content_versions(id) on delete cascade,
  state cooksmith.recipe_enrichment_job_state not null default 'pending',
  schema_version text not null default 'recipe-intelligence-v1',
  rules_version text not null default 'cooksmith-rules-v1',
  model_key text not null default 'deterministic',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  leased_until timestamptz,
  failure_category cooksmith.recipe_enrichment_failure_category,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_aud numeric(12, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint recipe_enrichment_jobs_identity_unique
    unique (recipe_version_id, schema_version, rules_version, model_key),
  constraint recipe_enrichment_jobs_versions_required check (
    char_length(btrim(schema_version)) between 1 and 80
    and char_length(btrim(rules_version)) between 1 and 80
    and char_length(btrim(model_key)) between 1 and 120
  ),
  constraint recipe_enrichment_jobs_attempts_range check (attempt_count between 0 and 3),
  constraint recipe_enrichment_jobs_usage_nonnegative check (
    latency_ms is null or latency_ms >= 0
  ),
  constraint recipe_enrichment_jobs_tokens_nonnegative check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (estimated_cost_aud is null or estimated_cost_aud >= 0)
  )
);

create table cooksmith.recipe_enrichments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references cooksmith.household_recipes(id) on delete cascade,
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  recipe_version_id uuid not null references cooksmith.recipe_content_versions(id) on delete cascade,
  job_id uuid not null references cooksmith.recipe_enrichment_jobs(id) on delete restrict,
  schema_version text not null,
  rules_version text not null,
  provider text not null,
  model_key text not null,
  result jsonb not null,
  overall_confidence text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint recipe_enrichments_job_unique unique (job_id),
  constraint recipe_enrichments_result_object check (jsonb_typeof(result) = 'object'),
  constraint recipe_enrichments_provider_required check (char_length(btrim(provider)) between 1 and 80),
  constraint recipe_enrichments_versions_required check (
    char_length(btrim(schema_version)) between 1 and 80
    and char_length(btrim(rules_version)) between 1 and 80
    and char_length(btrim(model_key)) between 1 and 120
  ),
  constraint recipe_enrichments_confidence_valid check (
    overall_confidence in ('high', 'medium', 'low', 'unknown')
  ),
  constraint recipe_enrichments_activation_consistent check (
    (is_active and activated_at is not null) or (not is_active)
  )
);

create table cooksmith.recipe_intelligence_settings (
  singleton boolean primary key default true,
  ai_enabled boolean not null default false,
  enqueue_enabled boolean not null default true,
  emergency_stop boolean not null default false,
  daily_recipe_limit integer not null default 25,
  monthly_cost_limit_aud numeric(10, 2) not null default 10,
  max_concurrency integer not null default 2,
  updated_at timestamptz not null default now(),
  constraint recipe_intelligence_settings_singleton check (singleton),
  constraint recipe_intelligence_settings_limits_positive check (
    daily_recipe_limit between 0 and 10000
    and monthly_cost_limit_aud between 0 and 10000
    and max_concurrency between 1 and 20
  )
);

insert into cooksmith.recipe_intelligence_settings (singleton) values (true);

create index recipe_content_versions_household_recipe_idx
  on cooksmith.recipe_content_versions (household_id, recipe_id, created_at desc);
create index recipe_enrichment_jobs_pending_idx
  on cooksmith.recipe_enrichment_jobs (available_at, created_at)
  where state = 'pending';
create index recipe_enrichment_jobs_diagnostics_idx
  on cooksmith.recipe_enrichment_jobs (state, failure_category, updated_at desc);
create index recipe_enrichments_recipe_version_idx
  on cooksmith.recipe_enrichments (recipe_id, recipe_version_id, created_at desc);
create unique index recipe_enrichments_one_active_recipe_idx
  on cooksmith.recipe_enrichments (recipe_id)
  where is_active;

create trigger recipe_enrichment_jobs_set_updated_at
before update on cooksmith.recipe_enrichment_jobs
for each row execute function cooksmith.set_updated_at();

create trigger recipe_intelligence_settings_set_updated_at
before update on cooksmith.recipe_intelligence_settings
for each row execute function cooksmith.set_updated_at();

create function cooksmith_private.queue_recipe_enrichment(target_recipe_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipe_record cooksmith.household_recipes%rowtype;
  snapshot jsonb;
  fingerprint_value text;
  version_id uuid;
  job_id uuid;
begin
  select * into recipe_record
  from cooksmith.household_recipes
  where id = target_recipe_id;

  if recipe_record.id is null or recipe_record.archived_at is not null then
    return null;
  end if;

  if not exists (
    select 1 from cooksmith.recipe_intelligence_settings
    where singleton and enqueue_enabled and not emergency_stop
  ) then
    return null;
  end if;

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
  fingerprint_value := md5(snapshot::text);

  insert into cooksmith.recipe_content_versions (
    recipe_id, household_id, fingerprint, source_snapshot
  )
  values (
    recipe_record.id, recipe_record.household_id, fingerprint_value, snapshot
  )
  on conflict (recipe_id, fingerprint) do nothing
  returning id into version_id;

  if version_id is null then
    select id into version_id
    from cooksmith.recipe_content_versions
    where recipe_id = target_recipe_id and fingerprint = fingerprint_value;
  end if;

  insert into cooksmith.recipe_enrichment_jobs (
    recipe_id, household_id, recipe_version_id
  )
  values (
    recipe_record.id, recipe_record.household_id, version_id
  )
  on conflict (recipe_version_id, schema_version, rules_version, model_key)
    do update set
      state = case
        when cooksmith.recipe_enrichment_jobs.state = 'processing'
          then cooksmith.recipe_enrichment_jobs.state
        else 'pending'::cooksmith.recipe_enrichment_job_state
      end,
      attempt_count = case
        when cooksmith.recipe_enrichment_jobs.state = 'processing'
          then cooksmith.recipe_enrichment_jobs.attempt_count
        else 0
      end,
      available_at = least(cooksmith.recipe_enrichment_jobs.available_at, now()),
      completed_at = case
        when cooksmith.recipe_enrichment_jobs.state = 'processing'
          then cooksmith.recipe_enrichment_jobs.completed_at
        else null
      end,
      failure_category = case
        when cooksmith.recipe_enrichment_jobs.state = 'processing'
          then cooksmith.recipe_enrichment_jobs.failure_category
        else null
      end
  returning id into job_id;

  return job_id;
end;
$$;

revoke all on function cooksmith_private.queue_recipe_enrichment(uuid) from public, anon, authenticated;
grant execute on function cooksmith_private.queue_recipe_enrichment(uuid) to service_role;

create function cooksmith_private.queue_recipe_enrichment_recipe_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform cooksmith_private.queue_recipe_enrichment(new.id);
  return new;
end;
$$;

create function cooksmith_private.queue_recipe_enrichment_child_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform cooksmith_private.queue_recipe_enrichment(
    case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end
  );
  return coalesce(new, old);
end;
$$;

revoke all on function cooksmith_private.queue_recipe_enrichment_recipe_trigger() from public, anon, authenticated;
revoke all on function cooksmith_private.queue_recipe_enrichment_child_trigger() from public, anon, authenticated;

create function cooksmith.activate_recipe_enrichment(
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
begin
  select * into job_record
  from cooksmith.recipe_enrichment_jobs
  where id = target_job_id
  for update;

  if job_record.id is null or job_record.state <> 'processing' then
    raise exception 'job_not_processing' using errcode = 'P0001';
  end if;

  if job_record.recipe_version_id <> (
    select id from cooksmith.recipe_content_versions
    where recipe_id = job_record.recipe_id
    order by created_at desc, id desc
    limit 1
  ) then
    raise exception 'stale_version' using errcode = 'P0001';
  end if;

  update cooksmith.recipe_enrichments
  set is_active = false
  where recipe_id = job_record.recipe_id and is_active;

  insert into cooksmith.recipe_enrichments (
    recipe_id,
    household_id,
    recipe_version_id,
    job_id,
    schema_version,
    rules_version,
    provider,
    model_key,
    result,
    overall_confidence,
    is_active,
    activated_at
  )
  values (
    job_record.recipe_id,
    job_record.household_id,
    job_record.recipe_version_id,
    job_record.id,
    job_record.schema_version,
    job_record.rules_version,
    target_provider,
    target_model_key,
    target_result,
    target_overall_confidence,
    true,
    now()
  )
  returning id into enrichment_id;

  return enrichment_id;
end;
$$;

revoke all on function cooksmith.activate_recipe_enrichment(uuid, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function cooksmith.activate_recipe_enrichment(uuid, text, text, jsonb, text)
  to service_role;

create trigger household_recipes_queue_enrichment
after insert or update of name, servings, prep_time_minutes, cook_time_minutes, archived_at
on cooksmith.household_recipes
for each row execute function cooksmith_private.queue_recipe_enrichment_recipe_trigger();

create trigger recipe_ingredients_queue_enrichment
after insert or update or delete on cooksmith.recipe_ingredients
for each row execute function cooksmith_private.queue_recipe_enrichment_child_trigger();

create trigger recipe_steps_queue_enrichment
after insert or update or delete on cooksmith.recipe_steps
for each row execute function cooksmith_private.queue_recipe_enrichment_child_trigger();

alter table cooksmith.recipe_content_versions enable row level security;
alter table cooksmith.recipe_enrichment_jobs enable row level security;
alter table cooksmith.recipe_enrichments enable row level security;
alter table cooksmith.recipe_intelligence_settings enable row level security;

grant select on cooksmith.recipe_content_versions to authenticated;
grant select on cooksmith.recipe_enrichments to authenticated;
grant select, insert, update, delete on cooksmith.recipe_content_versions to service_role;
grant select, insert, update, delete on cooksmith.recipe_enrichment_jobs to service_role;
grant select, insert, update, delete on cooksmith.recipe_enrichments to service_role;
grant select, update on cooksmith.recipe_intelligence_settings to service_role;

create policy recipe_content_versions_member_select
on cooksmith.recipe_content_versions for select to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

create policy recipe_enrichments_member_active_select
on cooksmith.recipe_enrichments for select to authenticated
using (is_active and (select cooksmith.is_active_household_member(household_id)));

comment on table cooksmith.recipe_content_versions is
  'Current immutable-identity recipe snapshot used to bind enrichment to exact source content.';
comment on table cooksmith.recipe_enrichment_jobs is
  'Durable, idempotent and bounded processing queue; browser roles have no access.';
comment on table cooksmith.recipe_enrichments is
  'Validated recipe intelligence results stored separately from user-approved recipe content.';
comment on table cooksmith.recipe_intelligence_settings is
  'Server-controlled enablement, kill switch and usage guardrails for Recipe Intelligence.';

commit;
