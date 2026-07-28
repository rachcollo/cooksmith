begin;

alter table cooksmith.recipe_enrichment_backfill_audit
  drop constraint recipe_enrichment_backfill_audit_action_check,
  add constraint recipe_enrichment_backfill_audit_action_check
    check (action in (
      'start', 'pause', 'resume', 'retry_failed',
      'enable_ai', 'disable_ai', 'reprocess_ai'
    ));

create function cooksmith.recipe_intelligence_ai_command(command text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not cooksmith.has_application_role('admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if command not in ('enable_ai', 'disable_ai') then
    raise exception 'invalid_command' using errcode = '22023';
  end if;

  update cooksmith.recipe_intelligence_settings
  set ai_enabled = command = 'enable_ai'
  where singleton;

  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
  values (auth.uid(), command);

  return cooksmith.recipe_enrichment_backfill_status();
end;
$$;

revoke all on function cooksmith.recipe_intelligence_ai_command(text)
  from public, anon;
grant execute on function cooksmith.recipe_intelligence_ai_command(text)
  to authenticated;

create function cooksmith_private.queue_provider_assisted_recipe_enrichment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.model_key <> 'deterministic' or not exists (
    select 1
    from cooksmith.recipe_intelligence_settings
    where singleton and ai_enabled and enqueue_enabled
      and not emergency_stop and not backfill_paused
  ) then
    return new;
  end if;

  insert into cooksmith.recipe_enrichment_jobs (
    source_kind, recipe_id, imported_recipe_id, household_id,
    recipe_version_id, schema_version, rules_version, model_key
  )
  values (
    new.source_kind, new.recipe_id, new.imported_recipe_id, new.household_id,
    new.recipe_version_id, new.schema_version, new.rules_version, 'provider-assisted-v1'
  )
  on conflict (recipe_version_id, schema_version, rules_version, model_key)
    do nothing;

  return new;
end;
$$;

revoke all on function cooksmith_private.queue_provider_assisted_recipe_enrichment()
  from public, anon, authenticated;

create trigger recipe_enrichment_jobs_queue_provider_assisted
after insert on cooksmith.recipe_enrichment_jobs
for each row
execute function cooksmith_private.queue_provider_assisted_recipe_enrichment();

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
    ) counts), '{}'::jsonb)
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
  if command not in ('start', 'pause', 'resume', 'retry_failed', 'reprocess_ai') then
    raise exception 'invalid_command' using errcode = '22023';
  end if;
  if command = 'reprocess_ai' and not exists (
    select 1 from cooksmith.recipe_intelligence_settings
    where singleton and ai_enabled and not emergency_stop
  ) then
    raise exception 'recipe_intelligence_ai_disabled' using errcode = '55000';
  end if;

  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action)
  values (auth.uid(), command);

  if command = 'pause' then
    update cooksmith.recipe_intelligence_settings
    set backfill_paused = true where singleton;
  elsif command = 'resume' then
    update cooksmith.recipe_intelligence_settings
    set backfill_paused = false where singleton;
  elsif command = 'retry_failed' then
    update cooksmith.recipe_enrichment_jobs
    set state = 'pending', available_at = now(), failure_category = null
    where id in (
      select id from cooksmith.recipe_enrichment_jobs
      where state = 'failed' and attempt_count < 3
      order by updated_at limit bounded_limit
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
    on conflict (recipe_version_id, schema_version, rules_version, model_key)
      do nothing;
    get diagnostics queued = row_count;
  else
    for recipe_record in
      (select 'household'::text source_kind, id
       from cooksmith.household_recipes
       where archived_at is null order by updated_at limit bounded_limit)
      union all
      (select 'shared_platform', id
       from cooksmith.imported_recipes
       where visibility = 'public' and archived_at is null
       order by updated_at limit bounded_limit)
    loop
      if recipe_record.source_kind = 'household' then
        perform cooksmith_private.queue_recipe_enrichment(recipe_record.id);
      else
        perform cooksmith_private.queue_shared_recipe_enrichment(recipe_record.id);
      end if;
      queued := queued + 1;
    end loop;
  end if;

  return jsonb_build_object(
    'queued', queued,
    'status', cooksmith.recipe_enrichment_backfill_status()
  );
end;
$$;

comment on function cooksmith.recipe_intelligence_ai_command(text) is
  'Audited admin-only Recipe Intelligence provider control; separate from weekly preparation AI.';
comment on trigger recipe_enrichment_jobs_queue_provider_assisted
  on cooksmith.recipe_enrichment_jobs is
  'Creates a distinct provider-assisted job for new recipe versions only while Recipe Intelligence AI is enabled.';

commit;
