begin;

alter table cooksmith.recipe_ingredients add column ingredient_structure jsonb;
alter table cooksmith.recipe_ingredients add constraint recipe_ingredients_structure_valid check (
  ingredient_structure is null or coalesce((
    jsonb_typeof(ingredient_structure) = 'object'
    and ingredient_structure->>'schemaVersion' = 'ingredient-structure-v1'
    and ingredient_structure->>'rulesVersion' = 'ingredient-structure-rules-v1'
    and ingredient_structure->>'originalText' = original_line_text
    and jsonb_typeof(ingredient_structure->'substitutions') = 'array'
    and jsonb_typeof(ingredient_structure->'noteReferences') = 'array'
  ),false)
);
comment on column cooksmith.recipe_ingredients.ingredient_structure is
  'Versioned deterministic projection; original_line_text remains authoritative. Existing rows are not rewritten by this migration.';

alter table cooksmith.recipe_enrichment_backfill_audit
  drop constraint recipe_enrichment_backfill_audit_action_check,
  add constraint recipe_enrichment_backfill_audit_action_check check (action in (
    'start','pause','resume','retry_failed','enable_ai','disable_ai','reprocess_ai',
    'recover_exhausted_ai_failures','update_daily_limit','reprocess_structure'
  ));

-- Multiple ingredient triggers within one save must have a deterministic newest snapshot.
alter table cooksmith.recipe_content_versions alter column created_at set default clock_timestamp();
alter table cooksmith.recipe_enrichment_jobs alter column rules_version set default 'cooksmith-rules-v4';

-- Upgrade current runtime gates, not released migration files or historical results.
do $upgrade$
declare signature regprocedure; definition text;
begin
  foreach signature in array array[
    'cooksmith.admin_recipe_enrichment_list(text,text)'::regprocedure,
    'cooksmith.recipe_enrichment_backfill_command(text,integer)'::regprocedure,
    'cooksmith.recipe_enrichment_backfill_status()'::regprocedure,
    'cooksmith_private.weekly_preparation_enrichment_settled()'::regprocedure,
    'cooksmith_private.weekly_preparation_recipes_ready()'::regprocedure
  ] loop
    definition := pg_get_functiondef(signature);
    execute replace(definition, 'cooksmith-rules-v3', 'cooksmith-rules-v4');
  end loop;
  foreach signature in array array['cooksmith_private.queue_recipe_enrichment(uuid)'::regprocedure,'cooksmith_private.queue_shared_recipe_enrichment(uuid)'::regprocedure] loop
    definition := pg_get_functiondef(signature);
    execute replace(definition, '''cookTimeMinutes'', recipe_record.cook_time_minutes', '''cookTimeMinutes'', recipe_record.cook_time_minutes, ''sourceUrl'', recipe_record.source_url, ''measurementSystem'', recipe_record.measurement_system, ''sourceVersion'', recipe_record.updated_at');
  end loop;
  definition := pg_get_functiondef('cooksmith_private.queue_recipe_enrichment(uuid)'::regprocedure);
  execute replace(definition, '''preparation'', ingredient.preparation',
    '''preparation'', ingredient.preparation, ''parserVersion'', ingredient.parser_version, ''structure'', ingredient.ingredient_structure, ''sourceVersion'', ingredient.updated_at');
  definition := pg_get_functiondef('cooksmith_private.queue_recipe_enrichment(uuid)'::regprocedure);
  execute replace(definition, '''instruction'', step.original_line_text', '''instruction'', step.original_line_text, ''sourceVersion'', step.updated_at');
end;
$upgrade$;

-- A bounded opt-in command reuses the durable CS-93 queue. No queue or backfill runs on migration.
do $command$
declare definition text;
begin
  definition := pg_get_functiondef('cooksmith.recipe_enrichment_backfill_command(text,integer)'::regprocedure);
  definition := replace(definition,
    '(''start'', ''pause'', ''resume'', ''retry_failed'', ''reprocess_ai'', ''recover_exhausted_ai_failures'')',
    '(''start'', ''pause'', ''resume'', ''retry_failed'', ''reprocess_ai'', ''recover_exhausted_ai_failures'', ''reprocess_structure'')');
  definition := replace(definition, 'elsif command = ''reprocess_ai'' then', $branch$
  elsif command = 'reprocess_structure' then
    if not exists(select 1 from cooksmith.recipe_intelligence_settings
      where singleton and enqueue_enabled and not emergency_stop and not backfill_paused) then
      raise exception 'recipe_reprocessing_paused' using errcode='55000';
    end if;
    for recipe_record in
      select candidate.source_kind,candidate.id from (
        select 'household'::text source_kind,id,updated_at from cooksmith.household_recipes where archived_at is null
        union all
        select 'shared_platform',id,updated_at from cooksmith.imported_recipes where visibility='public' and archived_at is null
      ) candidate
      where not exists (
        select 1 from cooksmith.recipe_enrichment_jobs job
        where job.source_kind::text=candidate.source_kind
          and coalesce(job.recipe_id,job.imported_recipe_id)=candidate.id
          and job.rules_version='cooksmith-rules-v4'
          and job.recipe_version_id=(select version.id from cooksmith.recipe_content_versions version
            where version.source_kind::text=candidate.source_kind
              and coalesce(version.recipe_id,version.imported_recipe_id)=candidate.id
            order by version.created_at desc,version.id desc limit 1)
      )
      order by candidate.updated_at,candidate.source_kind,candidate.id limit bounded_limit
    loop
      if recipe_record.source_kind='household' then
        perform cooksmith_private.queue_recipe_enrichment(recipe_record.id);
      else
        perform cooksmith_private.queue_shared_recipe_enrichment(recipe_record.id);
      end if;
      queued:=queued+1;
    end loop;
  elsif command = 'reprocess_ai' then
$branch$);
  execute definition;
end;
$command$;

-- An old worker cannot supersede a new-rule result during a rolling release.
do $activation$
declare definition text;
begin
  definition := pg_get_functiondef('cooksmith.activate_recipe_enrichment(uuid,text,text,jsonb,text)'::regprocedure);
  definition := replace(definition, 'if job_record.id is null or job_record.state <> ''processing'' then',
    'if job_record.rules_version = ''cooksmith-rules-v4'' and target_result->>''rulesVersion'' is not null and target_result->>''rulesVersion'' <> ''cooksmith-rules-v4'' then raise exception ''stale_rules'' using errcode=''P0001''; end if;
     if job_record.rules_version <> ''cooksmith-rules-v4'' and exists(select 1 from cooksmith.recipe_enrichments current_result where current_result.is_active and current_result.rules_version=''cooksmith-rules-v4'' and current_result.source_kind=job_record.source_kind and coalesce(current_result.recipe_id,current_result.imported_recipe_id)=coalesce(job_record.recipe_id,job_record.imported_recipe_id)) then raise exception ''stale_rules'' using errcode=''P0001''; end if;
     if job_record.id is null or job_record.state <> ''processing'' then');
  execute definition;
end;
$activation$;

-- Source aliases bridge old contributions to the new contract without renaming manual purchases.
create function cooksmith.shopping_sources_overlap(left_sources jsonb, right_sources jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(left_sources) l, jsonb_array_elements(right_sources) r
    where (l->>'sourceIngredientId' is not null and r->>'sourceIngredientId' is not null
      and l->>'sourceIngredientId'=r->>'sourceIngredientId'
      and l->>'sourceRecipeId'=r->>'sourceRecipeId' and l->>'sourceRecipeKind'=r->>'sourceRecipeKind')
    or ((l->>'sourceIngredientId' is null or r->>'sourceIngredientId' is null)
      and (coalesce(l->>'purchaseName',cooksmith.canonical_ingredient_name_v1(l->>'name'))=coalesce(r->>'purchaseName',cooksmith.canonical_ingredient_name_v1(r->>'name'))
        or coalesce(r->'legacyPurchaseNames','[]'::jsonb) ? cooksmith.canonical_ingredient_name_v1(l->>'name')
        or coalesce(l->'legacyPurchaseNames','[]'::jsonb) ? cooksmith.canonical_ingredient_name_v1(r->>'name'))
      and cooksmith.purchase_unit_v3(l->>'unit')=cooksmith.purchase_unit_v3(r->>'unit')));
$$;
revoke all on function cooksmith.shopping_sources_overlap(jsonb,jsonb) from public,anon;
grant execute on function cooksmith.shopping_sources_overlap(jsonb,jsonb) to authenticated,service_role;

do $compatibility$
declare definition text; old_clause text;
begin
  definition:=pg_get_functiondef('cooksmith.reconcile_planned_meal_shopping(uuid,uuid,jsonb)'::regprocedure);
  old_clause:=$old$and exists(select 1 from jsonb_array_elements(c.source_quantities) source
        where coalesce(source->>'purchaseName',cooksmith.canonical_ingredient_name_v1(source->>'name'))=ingredient.name
          and (coalesce(source->>'purchaseUnit',cooksmith.purchase_unit_v3(source->>'unit'))=ingredient.unit
            or exists(select 1 from jsonb_array_elements(ingredient.sources) incoming where cooksmith.purchase_unit_v3(incoming->>'unit')=cooksmith.purchase_unit_v3(source->>'unit'))))$old$;
  if position(old_clause in definition)=0 then raise exception 'Expected shopping reconciliation compatibility clause'; end if;
  execute replace(definition,old_clause,'and cooksmith.shopping_sources_overlap(c.source_quantities,ingredient.sources)');
end;
$compatibility$;

-- Explicit household refresh, bounded and compare-and-swap guarded. Reuses normal reconciliation.
create function cooksmith.refresh_shopping_ingredient_structure(target_household_id uuid, batches jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare batch jsonb; actual jsonb; previous_items jsonb; current_item record; recipe_version timestamptz;
begin
  if (select auth.uid()) is null or not (select cooksmith.is_active_household_member(target_household_id)) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
  if batches is null or jsonb_typeof(batches)<>'array' or jsonb_array_length(batches) not between 1 and 100 then raise exception 'Invalid refresh batch.' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
  perform 1 from cooksmith.shopping_list_items where household_id=target_household_id for update;
  perform 1 from cooksmith.shopping_item_contributions where household_id=target_household_id for update;
  select coalesce(jsonb_agg(to_jsonb(item)),'[]'::jsonb) into previous_items from (
    select i.id,i.completed,coalesce(jsonb_agg(s.value) filter(where s.value is not null),'[]'::jsonb) sources
    from cooksmith.shopping_list_items i left join cooksmith.shopping_item_contributions c on c.shopping_item_id=i.id
    left join lateral jsonb_array_elements(c.source_quantities) s on true
    where i.household_id=target_household_id and not i.manual group by i.id
  ) item;
  for batch in select value from jsonb_array_elements(batches) loop
    if not exists(select 1 from cooksmith.planned_meals m where m.id=(batch->>'mealId')::uuid and m.household_id=target_household_id
      and case when batch->>'recipeSource'='household' then m.recipe_id=(batch->>'recipeId')::uuid else m.imported_recipe_id=(batch->>'recipeId')::uuid end) then raise exception 'Meal changed.' using errcode='40001'; end if;
    if batch->>'recipeSource'='household' then
      select updated_at into recipe_version from cooksmith.household_recipes where id=(batch->>'recipeId')::uuid and household_id=target_household_id and archived_at is null for share;
    else
      select updated_at into recipe_version from cooksmith.imported_recipes where id=(batch->>'recipeId')::uuid and archived_at is null for share;
    end if;
    if recipe_version is null or recipe_version is distinct from (batch->>'recipeVersion')::timestamptz then raise exception 'Recipe changed.' using errcode='40001'; end if;
    select coalesce(jsonb_agg(to_jsonb(c) order by c.id),'[]'::jsonb) into actual from (
      select id,shopping_item_id,planned_meal_id,quantity,unit,source_quantities from cooksmith.shopping_item_contributions where household_id=target_household_id and planned_meal_id=(batch->>'mealId')::uuid
    ) c;
    if actual is distinct from (select jsonb_agg(value order by value->>'id') from jsonb_array_elements(batch->'expected')) then raise exception 'Shopping contributions changed.' using errcode='40001'; end if;
    perform cooksmith.reconcile_planned_meal_shopping(target_household_id,(batch->>'mealId')::uuid,batch->'inputs');
  end loop;
  -- Reprojection keeps bought state; a merge is bought only when every prior member was bought.
  -- Manual rows/overrides are not touched. A concurrently edited/removed contribution fails above.
  for current_item in
    select i.id,coalesce(jsonb_agg(s.value) filter(where s.value is not null),'[]'::jsonb) sources
    from cooksmith.shopping_list_items i join cooksmith.shopping_item_contributions c on c.shopping_item_id=i.id
    cross join lateral jsonb_array_elements(c.source_quantities) s
    where i.household_id=target_household_id and not i.manual group by i.id
  loop
    update cooksmith.shopping_list_items set completed=(
      exists(select 1 from jsonb_array_elements(previous_items) old where cooksmith.shopping_sources_overlap(old->'sources',current_item.sources))
      and not exists(select 1 from jsonb_array_elements(previous_items) old where not (old->>'completed')::boolean and cooksmith.shopping_sources_overlap(old->'sources',current_item.sources))
    ) where id=current_item.id;
  end loop;
end;
$$;
revoke all on function cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb) from public,anon;
grant execute on function cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb) to authenticated;

do $preview$
declare definition text;
begin
  definition:=pg_get_functiondef('cooksmith.recipe_enrichment_backfill_status()'::regprocedure);
  definition:=replace(definition,'''sources'', jsonb_build_object(', $field$
    'structurePreview', (
      select jsonb_build_object('household',count(*) filter(where candidate.source_kind='household'),'sharedPlatform',count(*) filter(where candidate.source_kind='shared_platform')) from (
        select 'household'::text source_kind,id from cooksmith.household_recipes where archived_at is null
        union all select 'shared_platform',id from cooksmith.imported_recipes where visibility='public' and archived_at is null
      ) candidate where not exists (
        select 1 from cooksmith.recipe_enrichment_jobs job where job.source_kind::text=candidate.source_kind and coalesce(job.recipe_id,job.imported_recipe_id)=candidate.id and job.rules_version='cooksmith-rules-v4'
          and job.recipe_version_id=(select version.id from cooksmith.recipe_content_versions version where version.source_kind::text=candidate.source_kind and coalesce(version.recipe_id,version.imported_recipe_id)=candidate.id order by version.created_at desc,version.id desc limit 1)
      )
    ), 'sources', jsonb_build_object($field$);
  execute definition;
end;
$preview$;

commit;
