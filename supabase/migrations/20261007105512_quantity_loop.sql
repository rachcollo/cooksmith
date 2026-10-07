begin;
-- Balances remain the CRUD source of truth. These immutable receipts record only
-- deliberate stock operations, not an event-sourced replacement for Pantry.
alter table cooksmith.household_pantry_items add column quantity_untracked boolean not null default false;
comment on column cooksmith.household_pantry_items.quantity_untracked is 'True means quantity is a known minimum, not a complete stocktake; unmeasured extra stock may exist.';
-- Only an explicit current-count correction clears uncertainty. Ordinary edits,
-- availability toggles and partial quantity adjustments preserve it.
alter table cooksmith.planned_meals add column completed_at timestamptz,
 add column completion_revision integer not null default 0 constraint planned_meal_completion_revision_valid check(completion_revision>=0);
create table cooksmith.meal_stock_operations (
 id uuid primary key,
 household_id uuid not null references cooksmith.households(id) on delete cascade,
 planned_meal_id uuid not null,
 action text not null constraint meal_stock_action_valid check(action in ('done','undo')),
 revision integer not null constraint meal_stock_revision_valid check(revision>0),
 request jsonb not null, effects jsonb not null,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 constraint meal_stock_occurrence_revision_unique unique(household_id,planned_meal_id,revision)
);
create index meal_stock_actor_idx on cooksmith.meal_stock_operations(actor_id);
alter table cooksmith.meal_stock_operations enable row level security;
revoke all on cooksmith.meal_stock_operations from public,anon,authenticated;
grant select on cooksmith.meal_stock_operations to authenticated;
create policy meal_stock_read_member on cooksmith.meal_stock_operations for select to authenticated using((select cooksmith.is_active_household_member(household_id)));

create function cooksmith_private.guard_meal_completion() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('authenticated','anon') then
  if tg_op='INSERT' and (new.completed_at is not null or new.completion_revision<>0) then raise exception 'Use the meal completion command.' using errcode='42501'; end if;
  if tg_op='UPDATE' then
   if new.completed_at is distinct from old.completed_at or new.completion_revision<>old.completion_revision then raise exception 'Use the meal completion command.' using errcode='42501'; end if;

  end if;
 end if;
 if tg_op='UPDATE' then
   if old.completed_at is not null and (new.recipe_id is distinct from old.recipe_id or new.imported_recipe_id is distinct from old.imported_recipe_id or new.freezer_meal_id is distinct from old.freezer_meal_id or new.title is distinct from old.title) then raise exception 'Undo this dinner before changing its source.' using errcode='PT409'; end if;
 end if;
 return new;
end; $$;
create trigger guard_meal_completion before insert or update on cooksmith.planned_meals for each row execute function cooksmith_private.guard_meal_completion();
revoke all on function cooksmith_private.guard_meal_completion() from public,anon,authenticated;

-- Historical consumption has already affected stock; synchronise state without consuming again.
update cooksmith.planned_meals p set completed_at=r.updated_at,completion_revision=1
from cooksmith.freezer_meal_reservations r where r.planned_meal_id=p.id and r.household_id=p.household_id and r.state='consumed';

create function cooksmith_private.meal_stock_command(p_household_id uuid,p_operation_id uuid,p_plan_id uuid,p_action text,p_expected_revision integer,p_expected_updated_at timestamptz,p_lines jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare meal cooksmith.planned_meals; prior cooksmith.meal_stock_operations; original cooksmith.meal_stock_operations;
 stock cooksmith.household_pantry_items; line jsonb; effect jsonb; effects jsonb:='[]'; request_value jsonb;
 seen uuid[]:='{}'; target uuid; amount numeric; before_quantity numeric; after_quantity numeric;
 source_freezer cooksmith.freezer_meals; reservation cooksmith.freezer_meal_reservations;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_operation_id is null or p_plan_id is null or p_action is null or p_action not in ('done','undo') or p_lines is null or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>200 then raise exception 'Check the meal review.' using errcode='23514'; end if;
 -- Existing freezer commands take freezer before shopping. Preserve that order.
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
 if meal.freezer_meal_id is not null then
  if jsonb_array_length(p_lines)<>0 then raise exception 'Freezer dinners use portions, not ingredients.' using errcode='23514'; end if;
  select * into source_freezer from cooksmith.freezer_meals where id=meal.freezer_meal_id and household_id=p_household_id for no key update;
  select * into reservation from cooksmith.freezer_meal_reservations where planned_meal_id=p_plan_id and household_id=p_household_id for update;
  if not found then raise exception 'Reservation is unavailable.' using errcode='PT409'; end if;
  if p_action='done' and reservation.state='reserved' then
   update cooksmith.freezer_meals set portions=portions-reservation.portions,revision=revision+1 where id=source_freezer.id;
   update cooksmith.freezer_meal_reservations set state='consumed' where id=reservation.id;
  elsif p_action='undo' and reservation.state='consumed' then
   update cooksmith.freezer_meals set portions=portions+reservation.portions,revision=revision+1 where id=source_freezer.id;
   update cooksmith.freezer_meal_reservations set state='reserved' where id=reservation.id;
  else raise exception 'Freezer state changed. Refresh before applying.' using errcode='PT409'; end if;
  effects:=jsonb_build_array(jsonb_build_object('freezerId',source_freezer.id,'amount',case when p_action='done' then -reservation.portions else reservation.portions end,'unit','portion'));
 else
  if p_action='undo' then
   select * into original from cooksmith.meal_stock_operations where household_id=p_household_id and planned_meal_id=p_plan_id and revision=meal.completion_revision and action='done';
   if not found then raise exception 'Recorded stock changes are unavailable.' using errcode='PT409'; end if;
  end if;
  -- Lock every referenced household stock row before checking snapshots and arithmetic.
  perform 1 from cooksmith.household_pantry_items where household_id=p_household_id and id in (select (value->>'pantryItemId')::uuid from jsonb_array_elements(p_lines)) order by id for update;
  for line in select value from jsonb_array_elements(p_lines) loop
   target:=(line->>'pantryItemId')::uuid;
   if target is null or target=any(seen) then raise exception 'Invalid or repeated Pantry item.' using errcode='23514'; end if;
   seen:=array_append(seen,target);
   select * into stock from cooksmith.household_pantry_items where id=target and household_id=p_household_id;
   if not found then raise exception 'Pantry item is unavailable.' using errcode='42501'; end if;
   if stock.updated_at is distinct from (line->>'updatedAt')::timestamptz or stock.name is distinct from line->>'name' or stock.unit is distinct from line->>'unit' then raise exception 'Pantry changed. Review the latest amounts.' using errcode='PT409'; end if;
   if stock.quantity is null then raise exception 'An unknown balance cannot be adjusted as zero.' using errcode='23514'; end if;
   if p_action='done' then
    amount:=(line->>'amount')::numeric;
    if amount is null or amount<=0 or amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Choose a positive measured amount.' using errcode='23514'; end if;
    amount:=-amount;
   else
    select value into effect from jsonb_array_elements(original.effects) where value->>'pantryItemId'=target::text;
    if not found or effect->>'name' is distinct from stock.name or effect->>'unit' is distinct from stock.unit then raise exception 'Recorded item changed. Correct Pantry before undoing.' using errcode='PT409'; end if;
    amount:=-(effect->>'amount')::numeric;
   end if;
   before_quantity:=stock.quantity; after_quantity:=before_quantity+amount;
   if after_quantity<0 or after_quantity>99999 or after_quantity<>round(after_quantity,2) then raise exception 'Check the measured stock amount.' using errcode='23514'; end if;
   update cooksmith.household_pantry_items set quantity=after_quantity,available=after_quantity>0 or quantity_untracked where id=target and household_id=p_household_id;
   effects:=effects||jsonb_build_array(jsonb_build_object('pantryItemId',target,'name',stock.name,'unit',stock.unit,'amount',amount,'beforeQuantity',before_quantity,'afterQuantity',after_quantity));
  end loop;
  if p_action='undo' and jsonb_array_length(effects)<>jsonb_array_length(original.effects) then raise exception 'Review every recorded stock change before undoing.' using errcode='23514'; end if;
 end if;
 update cooksmith.planned_meals set completed_at=case when p_action='done' then now() end,completion_revision=completion_revision+1 where id=p_plan_id;
 insert into cooksmith.meal_stock_operations(id,household_id,planned_meal_id,action,revision,request,effects,actor_id)
 values(p_operation_id,p_household_id,p_plan_id,p_action,meal.completion_revision+1,request_value,effects,auth.uid());
 return jsonb_build_object('revision',meal.completion_revision+1,'effects',effects);
end; $$;
create function cooksmith.meal_stock_command(p_household_id uuid,p_operation_id uuid,p_plan_id uuid,p_action text,p_expected_revision integer,p_expected_updated_at timestamptz,p_lines jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select cooksmith_private.meal_stock_command(p_household_id,p_operation_id,p_plan_id,p_action,p_expected_revision,p_expected_updated_at,p_lines); $$;
revoke all on function cooksmith_private.meal_stock_command(uuid,uuid,uuid,text,integer,timestamptz,jsonb),cooksmith.meal_stock_command(uuid,uuid,uuid,text,integer,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function cooksmith_private.meal_stock_command(uuid,uuid,uuid,text,integer,timestamptz,jsonb),cooksmith.meal_stock_command(uuid,uuid,uuid,text,integer,timestamptz,jsonb) to authenticated;
comment on function cooksmith_private.meal_stock_command(uuid,uuid,uuid,text,integer,timestamptz,jsonb) is 'Narrow atomic stock/completion receipt boundary: validates caller membership, household identifiers, immutable retry payload, completion generation and reviewed stock snapshots. Receipts are SELECT-only to clients.';
commit;
