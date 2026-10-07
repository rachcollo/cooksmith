begin;
-- Resolve recorded Undo effects to their current holder. A purchase can move to
-- Pantry between Done and Undo; this changes the holder, never the recorded amount.
create function cooksmith.meal_stock_undo_review(p_household_id uuid,p_plan_id uuid,p_revision integer)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare meal cooksmith.planned_meals; original cooksmith.meal_stock_operations; stock cooksmith.household_pantry_items;
 purchase cooksmith.shopping_stock_purchases; freezer cooksmith.freezer_meals; reservation cooksmith.freezer_meal_reservations;
 effect jsonb; entry jsonb; entries jsonb:='{}'::jsonb; key text; target uuid; amount numeric; current_quantity numeric;
 measure_dimension text; target_dimension text; factor numeric; target_factor numeric; idx integer; changed boolean:=false;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 select * into meal from cooksmith.planned_meals where id=p_plan_id and household_id=p_household_id;
 if not found then raise exception 'Meal is unavailable.' using errcode='42501'; end if;
 if meal.completed_at is null or meal.completion_revision is distinct from p_revision then raise exception 'Dinner changed. Refresh before undoing.' using errcode='PT409'; end if;
 select * into original from cooksmith.meal_stock_operations where household_id=p_household_id and planned_meal_id=p_plan_id and revision=p_revision and action='done';
 if meal.freezer_meal_id is not null then
  select * into freezer from cooksmith.freezer_meals where id=meal.freezer_meal_id and household_id=p_household_id;
  select * into reservation from cooksmith.freezer_meal_reservations where planned_meal_id=p_plan_id and household_id=p_household_id and state='consumed';
  if not found then raise exception 'Freezer reservation changed.' using errcode='PT409'; end if;
  return jsonb_build_object('lines',jsonb_build_array(jsonb_build_object('kind','freezer','freezerId',freezer.id,'revision',freezer.revision,'name',freezer.name,'unit','portion','amount',reservation.portions)),'changed',original.id is null or (original.effects->0->>'afterRevision')::integer is distinct from freezer.revision);
 end if;
 if original.id is null then raise exception 'Recorded usage is unavailable.' using errcode='PT409'; end if;
 for effect in select value from jsonb_array_elements(original.effects) loop
  if effect->>'kind' in ('untracked','recipe') then continue; end if;
  amount:=-(effect->>'amount')::numeric;
  target:=null; entry:=null;
  if effect->>'kind'='purchase' then
   select * into purchase from cooksmith.shopping_stock_purchases where id=(effect->>'purchaseId')::uuid and household_id=p_household_id;
   idx:=(effect->>'purchaseIndex')::integer;
   if not found or purchase.voided_at is not null or purchase.amounts->idx->>'unit' is distinct from effect->>'unit' then raise exception 'Recorded purchase changed. Review stock before undoing.' using errcode='PT409'; end if;
   if purchase.received_at is null then
    current_quantity:=(purchase.amounts->idx->>'quantity')::numeric-coalesce((purchase.consumed_amounts->>idx::text)::numeric,0);
    key:='p:'||purchase.id::text||':'||idx::text;
    entry:=jsonb_build_object('kind','purchase','purchaseId',purchase.id,'purchaseIndex',idx,'revision',purchase.revision,'name',purchase.name,'unit',effect->>'unit','amount',amount);
    changed:=changed or current_quantity is distinct from (effect->>'afterQuantity')::numeric;
   else
    select r.pantry_item_id into target from cooksmith.shopping_put_away_receipts r where r.household_id=p_household_id and r.source_key='p:'||purchase.id::text;
    if target is null then raise exception 'Received stock was removed. Correct Pantry before undoing.' using errcode='PT409'; end if;
    changed:=true;
   end if;
  else target:=(effect->>'pantryItemId')::uuid; end if;
  if target is not null then
   select * into stock from cooksmith.household_pantry_items where id=target and household_id=p_household_id;
   if not found or stock.quantity is null then raise exception 'Recorded stock is unavailable or unmeasured. Correct Pantry before undoing.' using errcode='PT409'; end if;
   if effect->>'kind'<>'purchase' and stock.name is distinct from effect->>'name' then raise exception 'Recorded ingredient changed. Correct Pantry before undoing.' using errcode='PT409'; end if;
   select d,f into measure_dimension,factor from cooksmith_private.exact_stock_measure(effect->>'unit');
   select d,f into target_dimension,target_factor from cooksmith_private.exact_stock_measure(stock.unit);
   if measure_dimension is null or measure_dimension is distinct from target_dimension then raise exception 'Recorded stock units changed. Correct Pantry before undoing.' using errcode='PT409'; end if;
   amount:=amount*factor/target_factor;
   if amount<>round(amount,2) then raise exception 'Recorded amount needs a compatible Pantry unit.' using errcode='PT409'; end if;
   key:='s:'||stock.id::text;
   entry:=jsonb_build_object('kind','pantry','pantryItemId',stock.id,'name',stock.name,'unit',stock.unit,'updatedAt',stock.updated_at,'amount',amount);
   changed:=changed or stock.quantity is distinct from (effect->>'afterQuantity')::numeric or stock.unit is distinct from effect->>'unit';
  end if;
  if entries ? key then entry:=jsonb_set(entry,'{amount}',to_jsonb((entries->key->>'amount')::numeric+amount)); end if;
  entries:=jsonb_set(entries,array[key],entry);
 end loop;
 return jsonb_build_object('lines',(select coalesce(jsonb_agg(e.value order by e.key),'[]') from jsonb_each(entries) e),'changed',changed);
end; $$;
revoke all on function cooksmith.meal_stock_undo_review(uuid,uuid,integer) from public,anon;
grant execute on function cooksmith.meal_stock_undo_review(uuid,uuid,integer) to authenticated;
-- The invoker preview needs this pure, non-data helper; it grants no stock access.
grant execute on function cooksmith_private.exact_stock_measure(text) to authenticated;

create or replace function cooksmith_private.meal_stock_command(p_household_id uuid,p_operation_id uuid,p_plan_id uuid,p_action text,p_expected_revision integer,p_expected_updated_at timestamptz,p_lines jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare meal cooksmith.planned_meals; prior cooksmith.meal_stock_operations; stock cooksmith.household_pantry_items;
 purchase cooksmith.shopping_stock_purchases; freezer cooksmith.freezer_meals; reservation cooksmith.freezer_meal_reservations;
 line jsonb; effects jsonb:='[]'; request_value jsonb; seen text[]:='{}'; key text; amount numeric; before_quantity numeric; after_quantity numeric; idx integer;
 dimension text; factor numeric; review jsonb; kind text; recipe_version timestamptz; recipe_context jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_operation_id is null or p_plan_id is null or p_action is null or p_action not in ('done','undo') or p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>200 then raise exception 'Check the meal review.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':freezer',0));
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':shopping',0));
 if not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 request_value:=jsonb_build_object('planId',p_plan_id,'action',p_action,'revision',p_expected_revision,'updatedAt',p_expected_updated_at,'lines',p_lines);
 select * into prior from cooksmith.meal_stock_operations where id=p_operation_id;
 if found then
  if prior.household_id<>p_household_id or prior.request<>request_value then raise exception 'Operation identifier was already used.' using errcode='23514'; end if;
  return jsonb_build_object('revision',prior.revision,'effects',prior.effects);
 end if;
 select * into meal from cooksmith.planned_meals where id=p_plan_id and household_id=p_household_id for update;
 if not found then raise exception 'Meal is unavailable.' using errcode='42501'; end if;
 if meal.completion_revision is distinct from p_expected_revision or meal.updated_at is distinct from p_expected_updated_at then raise exception 'Dinner changed. Refresh before applying.' using errcode='PT409'; end if;
 if (p_action='done' and meal.completed_at is not null) or (p_action='undo' and meal.completed_at is null) then raise exception 'Dinner state changed. Refresh before applying.' using errcode='PT409'; end if;
 perform 1 from cooksmith.household_pantry_items where household_id=p_household_id order by id for update;
 perform 1 from cooksmith.shopping_stock_purchases where household_id=p_household_id order by id for update;
 if meal.freezer_meal_id is not null then
  select * into freezer from cooksmith.freezer_meals where id=meal.freezer_meal_id and household_id=p_household_id for no key update;
  select * into reservation from cooksmith.freezer_meal_reservations where planned_meal_id=p_plan_id and household_id=p_household_id for update;
  if not found or jsonb_array_length(p_lines)<>1 or p_lines->0->>'kind'<>'freezer' or (p_lines->0->>'freezerId')::uuid is distinct from freezer.id or (p_lines->0->>'revision')::integer is distinct from freezer.revision then raise exception 'Freezer changed. Refresh before applying.' using errcode='PT409'; end if;
  if p_action='done' and reservation.state='reserved' then amount:=-reservation.portions;
  elsif p_action='undo' and reservation.state='consumed' then amount:=reservation.portions;
  else raise exception 'Freezer reservation changed.' using errcode='PT409'; end if;
  update cooksmith.freezer_meals set portions=portions+amount::integer,revision=revision+1 where id=freezer.id;
  update cooksmith.freezer_meal_reservations set state=case when p_action='done' then 'consumed' else 'reserved' end where id=reservation.id;
  effects:=jsonb_build_array(jsonb_build_object('kind','freezer','freezerId',freezer.id,'amount',amount,'unit','portion','afterRevision',freezer.revision+1));
 else
  if p_action='undo' then
   review:=cooksmith.meal_stock_undo_review(p_household_id,p_plan_id,p_expected_revision);
   if review->'lines' is distinct from p_lines then raise exception 'Stock changed. Review the latest Undo amounts.' using errcode='PT409'; end if;
  end if;
  if p_action='done' and (meal.recipe_id is not null or meal.imported_recipe_id is not null) and exists(select 1 from jsonb_array_elements(p_lines) l where l->>'kind' in ('pantry','purchase')) then
   select l into recipe_context from jsonb_array_elements(p_lines) l where l->>'kind'='recipe';
   if meal.recipe_id is not null then select updated_at into recipe_version from cooksmith.household_recipes where id=meal.recipe_id and household_id=p_household_id for share;
   else select updated_at into recipe_version from cooksmith.imported_recipes where id=meal.imported_recipe_id for share; end if;
   if recipe_context->>'recipeId' is distinct from coalesce(meal.recipe_id,meal.imported_recipe_id)::text or recipe_version is null or recipe_version is distinct from (recipe_context->>'updatedAt')::timestamptz then raise exception 'Recipe changed. Refresh before marking dinner done.' using errcode='PT409'; end if;
  end if;
  -- Validate the entire snapshot before any mutation, including multiple measures
  -- belonging to one purchase. Every mutation below is in this same transaction.
  for line in select value from jsonb_array_elements(p_lines) loop
   kind:=coalesce(line->>'kind','pantry');
   if kind='recipe' then
    if p_action<>'done' then raise exception 'Invalid recipe context.' using errcode='23514'; end if;
    continue;
   end if;
   if kind='untracked' then
    if p_action<>'done' or char_length(coalesce(line->>'name','')) not between 1 and 160 then raise exception 'Invalid untracked source.' using errcode='23514'; end if;
    continue;
   end if;
   amount:=(line->>'amount')::numeric;
   select d,f into dimension,factor from cooksmith_private.exact_stock_measure(line->>'unit');
   if amount is null or amount<=0 or amount>99999 or amount::text in ('NaN','Infinity','-Infinity') or amount<>round(amount,2) or dimension is null then raise exception 'Choose a compatible measured amount.' using errcode='23514'; end if;
   if kind='pantry' then
    select * into stock from cooksmith.household_pantry_items where id=(line->>'pantryItemId')::uuid and household_id=p_household_id;
    if not found then raise exception 'Pantry item is unavailable.' using errcode='42501'; end if;
    key:='s:'||stock.id::text;
    if stock.updated_at is distinct from (line->>'updatedAt')::timestamptz or stock.name is distinct from line->>'name' or stock.unit is distinct from line->>'unit' then raise exception 'Pantry changed. Review the latest amounts.' using errcode='PT409'; end if;
    if stock.quantity is null or (p_action='done' and (not stock.available or amount>stock.quantity)) then raise exception 'Check the measured Pantry amount.' using errcode='23514'; end if;
   elsif kind='purchase' then
    select * into purchase from cooksmith.shopping_stock_purchases where id=(line->>'purchaseId')::uuid and household_id=p_household_id;
    if not found then raise exception 'Purchase is unavailable.' using errcode='42501'; end if;
    idx:=(line->>'purchaseIndex')::integer; key:='p:'||purchase.id::text||':'||idx::text;
    if idx is null or idx<0 or idx>=jsonb_array_length(purchase.amounts) or purchase.received_at is not null or purchase.voided_at is not null or purchase.revision is distinct from (line->>'revision')::integer or purchase.name is distinct from line->>'name' or purchase.amounts->idx->>'unit' is distinct from line->>'unit' then raise exception 'Bought food changed. Review the latest amounts.' using errcode='PT409'; end if;
    before_quantity:=(purchase.amounts->idx->>'quantity')::numeric-coalesce((purchase.consumed_amounts->>idx::text)::numeric,0);
    if before_quantity is null or (p_action='done' and amount>before_quantity) or (p_action='undo' and amount>coalesce((purchase.consumed_amounts->>idx::text)::numeric,0)) then raise exception 'Check the recorded purchase amount.' using errcode='23514'; end if;
   else raise exception 'Invalid stock source.' using errcode='23514'; end if;
   if key is null or key=any(seen) then raise exception 'Repeated stock source.' using errcode='23514'; end if;
   seen:=array_append(seen,key);
  end loop;
  for line in select value from jsonb_array_elements(p_lines) loop
   kind:=coalesce(line->>'kind','pantry');
   if kind in ('untracked','recipe') then effects:=effects||jsonb_build_array(line); continue; end if;
   amount:=(line->>'amount')::numeric*case when p_action='done' then -1 else 1 end;
   if kind='pantry' then
    select * into stock from cooksmith.household_pantry_items where id=(line->>'pantryItemId')::uuid and household_id=p_household_id;
    before_quantity:=stock.quantity; after_quantity:=before_quantity+amount;
    if after_quantity<0 or after_quantity>99999 then raise exception 'Check the measured stock amount.' using errcode='23514'; end if;
    update cooksmith.household_pantry_items set quantity=after_quantity,available=after_quantity>0 or quantity_untracked where id=stock.id;
   else
    select * into purchase from cooksmith.shopping_stock_purchases where id=(line->>'purchaseId')::uuid and household_id=p_household_id;
    idx:=(line->>'purchaseIndex')::integer;
    before_quantity:=(purchase.amounts->idx->>'quantity')::numeric-coalesce((purchase.consumed_amounts->>idx::text)::numeric,0); after_quantity:=before_quantity+amount;
    update cooksmith.shopping_stock_purchases set consumed_amounts=jsonb_set(consumed_amounts,array[idx::text],to_jsonb(coalesce((consumed_amounts->>idx::text)::numeric,0)-amount)),revision=revision+1 where id=purchase.id;
   end if;
   effects:=effects||jsonb_build_array(line||jsonb_build_object('kind',kind,'amount',amount,'beforeQuantity',before_quantity,'afterQuantity',after_quantity));
  end loop;
 end if;
 update cooksmith.planned_meals set completed_at=case when p_action='done' then now() end,completion_revision=completion_revision+1 where id=p_plan_id;
 insert into cooksmith.meal_stock_operations(id,household_id,planned_meal_id,action,revision,request,effects,actor_id) values(p_operation_id,p_household_id,p_plan_id,p_action,meal.completion_revision+1,request_value,effects,auth.uid());
 return jsonb_build_object('revision',meal.completion_revision+1,'effects',effects);
end; $$;

-- Old clients may replay an already-recorded legacy operation, but must refresh
-- before issuing a new stock mutation without completion/stock revision checks.
alter function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb) rename to freezer_command_before_quantity_loop;
revoke all on function cooksmith_private.freezer_command_before_quantity_loop(uuid,uuid,text,uuid,uuid,jsonb) from public,anon,authenticated;
create function cooksmith_private.freezer_command(p_household_id uuid,p_operation_id uuid,p_action text,p_freezer_id uuid,p_plan_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_action in ('consume','undo') and not exists(select 1 from cooksmith.freezer_meal_events where id=p_operation_id and household_id=p_household_id) then raise exception 'Refresh Plan to use Done or Undo with current stock.' using errcode='PT409'; end if;
 return cooksmith_private.freezer_command_before_quantity_loop(p_household_id,p_operation_id,p_action,p_freezer_id,p_plan_id,p_payload);
end; $$;
create or replace function cooksmith.freezer_command(p_household_id uuid,p_operation_id uuid,p_action text,p_freezer_id uuid,p_plan_id uuid default null,p_payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select cooksmith_private.freezer_command(p_household_id,p_operation_id,p_action,p_freezer_id,p_plan_id,p_payload); $$;
revoke all on function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb) to authenticated;
-- One MVCC read keeps the shopping projection consistent across stock transfers.
create function cooksmith.shopping_stock_snapshot(p_household_id uuid) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 return jsonb_build_object(
 'items',(select coalesce(jsonb_agg(to_jsonb(i)||jsonb_build_object('shopping_item_contributions',(select coalesce(jsonb_agg(to_jsonb(c)),'[]') from cooksmith.shopping_item_contributions c where c.shopping_item_id=i.id)) order by i.completed,i.position,i.display_name),'[]') from cooksmith.shopping_list_items i where i.household_id=p_household_id),
 'settings',(select to_jsonb(s) from cooksmith.household_shopping_periods s where s.household_id=p_household_id),
 'meals',(select coalesce(jsonb_agg(to_jsonb(m)),'[]') from cooksmith.planned_meals m where m.household_id=p_household_id),
 'pantry',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from cooksmith.household_pantry_items p where p.household_id=p_household_id),
 'purchases',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from cooksmith.shopping_stock_purchases p where p.household_id=p_household_id and p.voided_at is null));
end; $$;
revoke all on function cooksmith.shopping_stock_snapshot(uuid) from public,anon;
grant execute on function cooksmith.shopping_stock_snapshot(uuid) to authenticated;
create or replace function cooksmith.shopping_put_away_sources(target_household_id uuid)
returns table(source_key text,shopping_item_id uuid,contribution_id uuid,planned_meal_id uuid,name text,source_quantities jsonb,snapshot_token text)
language sql stable security invoker set search_path='' as $$
 with sources as (
 select case when c.id is null then 'm:'||i.id::text else 'c:'||c.id::text end source_key,
 i.id shopping_item_id,c.id contribution_id,c.planned_meal_id,i.display_name name,
 coalesce(c.source_quantities,'[]'::jsonb) source_quantities,
 md5(jsonb_build_array(i.id,i.display_name,i.quantity,i.unit,i.completed,i.manual,i.plan_override,c.id,c.quantity,c.unit,c.source_quantities)::text) snapshot_token
 from cooksmith.shopping_list_items i left join cooksmith.shopping_item_contributions c on c.shopping_item_id=i.id and c.household_id=i.household_id
 where i.household_id=target_household_id and i.completed
 and auth.uid() is not null and cooksmith.is_active_household_member(target_household_id)
 )
 select s.* from sources s where not exists(
 select 1 from cooksmith.shopping_put_away_receipts r where r.household_id=target_household_id and (
 r.source_key=s.source_key
 -- Preserve applied identity across equivalent CS-101 source refreshes, including
 -- changes of row/unit representation. A different planned meal is a new purchase.
 or (s.planned_meal_id is not null and r.planned_meal_id=s.planned_meal_id and cooksmith.shopping_sources_overlap(r.source_quantities,s.source_quantities))
 -- An explicit override whose plan was deleted must not become a new manual purchase.
 or (s.contribution_id is null and r.shopping_item_id=s.shopping_item_id)
 )) and not exists(
 select 1 from cooksmith.shopping_stock_purchases p where p.household_id=target_household_id and p.voided_at is null and (
 s.source_key=any(p.source_keys)
 or (s.contribution_id is null and s.shopping_item_id=any(p.item_ids))
 or exists(select 1 from jsonb_array_elements(p.source_quantities) q where q->>'plannedMealId'=s.planned_meal_id::text and cooksmith.shopping_sources_overlap(q->'sources',s.source_quantities))
 )) order by s.name,s.source_key;
$$;

commit;
