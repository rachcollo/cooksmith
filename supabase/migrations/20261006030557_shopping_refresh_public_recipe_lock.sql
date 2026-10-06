begin;

-- Locking SELECTs also apply UPDATE RLS. Public recipes deliberately cannot be
-- updated by readers, so an invoker FOR SHARE hides them. This private capability
-- locks only a readable recipe linked to the caller's active household plan; it
-- returns its version, never grants recipe writes, and retains the lock until the
-- refresh transaction ends (including comparison and contribution reconciliation).
create function cooksmith_private.lock_shopping_imported_recipe_version(
  target_household_id uuid, target_meal_id uuid, target_recipe_id uuid
) returns timestamptz language plpgsql security definer set search_path='' as $$
declare caller_id uuid := auth.uid(); recipe_version timestamptz;
begin
  if caller_id is null or not cooksmith.is_active_household_member(target_household_id) then
    raise exception 'Active household membership is required.' using errcode='42501';
  end if;
  if not exists(select 1 from cooksmith.planned_meals
    where id=target_meal_id and household_id=target_household_id
      and imported_recipe_id=target_recipe_id) then
    raise exception 'Meal changed.' using errcode='PT409';
  end if;
  select updated_at into recipe_version from cooksmith.imported_recipes
    where id=target_recipe_id and archived_at is null
      and (visibility='public' or owner_id=caller_id)
    for share;
  return recipe_version;
end;
$$;
revoke all on function cooksmith_private.lock_shopping_imported_recipe_version(uuid,uuid,uuid) from public,anon;
grant execute on function cooksmith_private.lock_shopping_imported_recipe_version(uuid,uuid,uuid) to authenticated;

do $public_recipe_lock$
declare definition text; old_clause text := $old$select updated_at into recipe_version from cooksmith.imported_recipes where id=(batch->>'recipeId')::uuid and archived_at is null for share;$old$;
begin
  definition := pg_get_functiondef('cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)'::regprocedure);
  if (length(definition)-length(replace(definition,old_clause,'')))/length(old_clause) <> 1 then
    raise exception 'Expected one imported recipe version lock in shopping refresh';
  end if;
  execute replace(definition,old_clause,$new$recipe_version := cooksmith_private.lock_shopping_imported_recipe_version(target_household_id,(batch->>'mealId')::uuid,(batch->>'recipeId')::uuid);$new$);
end;
$public_recipe_lock$;

commit;
