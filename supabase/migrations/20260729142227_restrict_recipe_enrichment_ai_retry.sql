begin;

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
      where state = 'failed'
        and attempt_count < 3
        and model_key = 'provider-assisted-v1'
      order by updated_at
      limit bounded_limit
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

comment on function cooksmith.recipe_enrichment_backfill_command(text, integer) is
  'Audited admin backfill control; failed retries release provider-assisted jobs only.';

commit;
