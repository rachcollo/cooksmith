begin;

create type cooksmith.recipe_enrichment_source as enum ('household', 'shared_platform');

alter table cooksmith.recipe_content_versions
  add column source_kind cooksmith.recipe_enrichment_source not null default 'household',
  add column imported_recipe_id uuid references cooksmith.imported_recipes(id) on delete cascade,
  alter column recipe_id drop not null,
  alter column household_id drop not null,
  drop constraint recipe_content_versions_identity_unique,
  add constraint recipe_content_versions_household_identity_unique unique (recipe_id, fingerprint),
  add constraint recipe_content_versions_source_valid check (
    (source_kind = 'household' and recipe_id is not null and imported_recipe_id is null and household_id is not null)
    or
    (source_kind = 'shared_platform' and recipe_id is null and imported_recipe_id is not null and household_id is null)
  );

create unique index recipe_content_versions_shared_identity_unique
  on cooksmith.recipe_content_versions (imported_recipe_id, fingerprint) where source_kind = 'shared_platform';

alter table cooksmith.recipe_enrichment_jobs
  add column source_kind cooksmith.recipe_enrichment_source not null default 'household',
  add column imported_recipe_id uuid references cooksmith.imported_recipes(id) on delete cascade,
  alter column recipe_id drop not null,
  alter column household_id drop not null,
  add constraint recipe_enrichment_jobs_source_valid check (
    (source_kind = 'household' and recipe_id is not null and imported_recipe_id is null and household_id is not null)
    or
    (source_kind = 'shared_platform' and recipe_id is null and imported_recipe_id is not null and household_id is null)
  );

alter table cooksmith.recipe_enrichments
  add column source_kind cooksmith.recipe_enrichment_source not null default 'household',
  add column imported_recipe_id uuid references cooksmith.imported_recipes(id) on delete cascade,
  alter column recipe_id drop not null,
  alter column household_id drop not null,
  add constraint recipe_enrichments_source_valid check (
    (source_kind = 'household' and recipe_id is not null and imported_recipe_id is null and household_id is not null)
    or
    (source_kind = 'shared_platform' and recipe_id is null and imported_recipe_id is not null and household_id is null)
  );

drop index cooksmith.recipe_enrichments_one_active_recipe_idx;
create unique index recipe_enrichments_one_active_household_recipe_idx
  on cooksmith.recipe_enrichments (recipe_id) where source_kind = 'household' and is_active;
create unique index recipe_enrichments_one_active_shared_recipe_idx
  on cooksmith.recipe_enrichments (imported_recipe_id) where source_kind = 'shared_platform' and is_active;
create index recipe_enrichment_jobs_source_status_idx
  on cooksmith.recipe_enrichment_jobs (source_kind, state, updated_at desc);

alter table cooksmith.recipe_intelligence_settings
  add column backfill_paused boolean not null default false;

create table cooksmith.recipe_enrichment_backfill_audit (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('start', 'pause', 'resume', 'retry_failed')),
  created_at timestamptz not null default now()
);
alter table cooksmith.recipe_enrichment_backfill_audit enable row level security;
revoke all on cooksmith.recipe_enrichment_backfill_audit from public, anon, authenticated;
grant all on cooksmith.recipe_enrichment_backfill_audit to service_role;
grant usage, select on sequence cooksmith.recipe_enrichment_backfill_audit_id_seq to service_role;

create or replace function cooksmith_private.queue_shared_recipe_enrichment(target_recipe_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipe_record cooksmith.imported_recipes%rowtype;
  snapshot jsonb;
  fingerprint_value text;
  version_id uuid;
  job_id uuid;
begin
  select * into recipe_record from cooksmith.imported_recipes where id = target_recipe_id;
  if recipe_record.id is null or recipe_record.visibility <> 'public'
    or recipe_record.archived_at is not null then return null; end if;
  if not exists (
    select 1 from cooksmith.recipe_intelligence_settings
    where singleton and enqueue_enabled and not emergency_stop and not backfill_paused
  ) then return null; end if;

  snapshot := jsonb_build_object(
    'recipe', jsonb_build_object(
      'id', recipe_record.id, 'name', recipe_record.name, 'servings', recipe_record.servings,
      'prepTimeMinutes', recipe_record.prep_time_minutes, 'cookTimeMinutes', recipe_record.cook_time_minutes
    ),
    'ingredients', recipe_record.ingredient_rows,
    'steps', recipe_record.instruction_steps
  );
  fingerprint_value := md5(snapshot::text);

  insert into cooksmith.recipe_content_versions
    (source_kind, imported_recipe_id, household_id, recipe_id, fingerprint, source_snapshot)
  values ('shared_platform', recipe_record.id, null, null, fingerprint_value, snapshot)
  on conflict (imported_recipe_id, fingerprint) where source_kind = 'shared_platform' do nothing
  returning id into version_id;
  if version_id is null then
    select id into version_id from cooksmith.recipe_content_versions
    where source_kind = 'shared_platform' and imported_recipe_id = target_recipe_id
      and fingerprint = fingerprint_value;
  end if;

  insert into cooksmith.recipe_enrichment_jobs
    (source_kind, imported_recipe_id, household_id, recipe_id, recipe_version_id)
  values ('shared_platform', recipe_record.id, null, null, version_id)
  on conflict (recipe_version_id, schema_version, rules_version, model_key) do update set
    state = case when cooksmith.recipe_enrichment_jobs.state in ('processing', 'completed')
      then cooksmith.recipe_enrichment_jobs.state else 'pending' end,
    available_at = case when cooksmith.recipe_enrichment_jobs.state in ('processing', 'completed')
      then cooksmith.recipe_enrichment_jobs.available_at else now() end,
    failure_category = case when cooksmith.recipe_enrichment_jobs.state in ('processing', 'completed')
      then cooksmith.recipe_enrichment_jobs.failure_category else null end
  returning id into job_id;
  return job_id;
end;
$$;
revoke all on function cooksmith_private.queue_shared_recipe_enrichment(uuid) from public, anon, authenticated;
grant execute on function cooksmith_private.queue_shared_recipe_enrichment(uuid) to service_role;

create function cooksmith_private.queue_shared_recipe_enrichment_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.visibility <> 'public' or new.archived_at is not null then
    update cooksmith.recipe_enrichments set is_active = false
    where source_kind = 'shared_platform' and imported_recipe_id = new.id and is_active;
    update cooksmith.recipe_enrichment_jobs
      set state = 'cancelled', failure_category = 'stale_version', leased_until = null
    where source_kind = 'shared_platform' and imported_recipe_id = new.id
      and state in ('pending', 'processing');
    return new;
  end if;
  perform cooksmith_private.queue_shared_recipe_enrichment(new.id);
  return new;
end;
$$;
revoke all on function cooksmith_private.queue_shared_recipe_enrichment_trigger() from public, anon, authenticated;

create trigger imported_recipes_queue_enrichment
after insert or update of visibility, name, servings, prep_time_minutes, cook_time_minutes,
  ingredient_rows, instruction_steps, archived_at
on cooksmith.imported_recipes
for each row execute function cooksmith_private.queue_shared_recipe_enrichment_trigger();

create or replace function cooksmith.activate_recipe_enrichment(
  target_job_id uuid, target_provider text, target_model_key text,
  target_result jsonb, target_overall_confidence text
)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare job_record cooksmith.recipe_enrichment_jobs%rowtype; enrichment_id uuid; current_version_id uuid;
begin
  select * into job_record from cooksmith.recipe_enrichment_jobs where id = target_job_id for update;
  if job_record.id is null or job_record.state <> 'processing' then
    raise exception 'job_not_processing' using errcode = 'P0001';
  end if;
  if job_record.source_kind = 'household' and not exists (
    select 1 from cooksmith.household_recipes
    where id = job_record.recipe_id and archived_at is null
  ) then raise exception 'stale_version' using errcode = 'P0001'; end if;
  if job_record.source_kind = 'shared_platform' and not exists (
    select 1 from cooksmith.imported_recipes
    where id = job_record.imported_recipe_id and visibility = 'public' and archived_at is null
  ) then raise exception 'stale_version' using errcode = 'P0001'; end if;
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
  ) returning id into enrichment_id;
  return enrichment_id;
end;
$$;

create or replace function cooksmith.recipe_enrichment_backfill_status()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not cooksmith.has_application_role('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'paused', (select backfill_paused from cooksmith.recipe_intelligence_settings where singleton),
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
      select state::text, count(*) total from cooksmith.recipe_enrichment_jobs group by state
    ) counts), '{}'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function cooksmith.recipe_enrichment_backfill_command(command text, batch_limit integer default 25)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare recipe_record record; queued integer := 0; bounded_limit integer := least(greatest(batch_limit, 1), 100);
begin
  if not cooksmith.has_application_role('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  if command not in ('start', 'pause', 'resume', 'retry_failed') then raise exception 'invalid_command'; end if;
  insert into cooksmith.recipe_enrichment_backfill_audit(actor_id, action) values (auth.uid(), command);
  if command = 'pause' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = true where singleton;
  elsif command = 'resume' then
    update cooksmith.recipe_intelligence_settings set backfill_paused = false where singleton;
  elsif command = 'retry_failed' then
    update cooksmith.recipe_enrichment_jobs set state = 'pending', available_at = now(), failure_category = null
    where id in (select id from cooksmith.recipe_enrichment_jobs where state = 'failed' and attempt_count < 3 order by updated_at limit bounded_limit);
    get diagnostics queued = row_count;
  else
    for recipe_record in
      (select 'household'::text source_kind, id from cooksmith.household_recipes where archived_at is null order by updated_at limit bounded_limit)
      union all
      (select 'shared_platform', id from cooksmith.imported_recipes where visibility = 'public' and archived_at is null order by updated_at limit bounded_limit)
    loop
      if recipe_record.source_kind = 'household' then
        perform cooksmith_private.queue_recipe_enrichment(recipe_record.id);
      else
        perform cooksmith_private.queue_shared_recipe_enrichment(recipe_record.id);
      end if;
      queued := queued + 1;
    end loop;
  end if;
  return jsonb_build_object('queued', queued, 'status', cooksmith.recipe_enrichment_backfill_status());
end;
$$;

revoke all on function cooksmith.recipe_enrichment_backfill_status() from public, anon;
revoke all on function cooksmith.recipe_enrichment_backfill_command(text, integer) from public, anon;
grant execute on function cooksmith.recipe_enrichment_backfill_status() to authenticated;
grant execute on function cooksmith.recipe_enrichment_backfill_command(text, integer) to authenticated;

drop policy recipe_content_versions_member_select on cooksmith.recipe_content_versions;
create policy recipe_content_versions_member_select on cooksmith.recipe_content_versions
for select to authenticated using (
  (source_kind = 'household' and (select cooksmith.is_active_household_member(household_id)))
  or source_kind = 'shared_platform'
);
drop policy recipe_enrichments_member_active_select on cooksmith.recipe_enrichments;
create policy recipe_enrichments_member_active_select on cooksmith.recipe_enrichments
for select to authenticated using (
  is_active and (
    (source_kind = 'household' and (select cooksmith.is_active_household_member(household_id)))
    or source_kind = 'shared_platform'
  )
);

comment on function cooksmith.recipe_enrichment_backfill_command(text, integer) is
  'Admin-only, bounded and idempotent backfill control; Production execution requires separate approval.';

commit;
