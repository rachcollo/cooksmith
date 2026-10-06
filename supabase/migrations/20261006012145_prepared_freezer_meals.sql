begin;
create table cooksmith.freezer_meals (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references cooksmith.households(id) on delete cascade,
 name text not null constraint freezer_meal_name check(char_length(btrim(name)) between 1 and 120),
 portions integer not null constraint freezer_meal_portions check(portions between 0 and 9999),
 frozen_on date not null,
 use_first_on date,
 notes text constraint freezer_meal_notes check(notes is null or char_length(notes)<=500),
 household_recipe_id uuid references cooksmith.household_recipes(id) on delete set null,
 imported_recipe_id uuid references cooksmith.imported_recipes(id) on delete set null,
 archived_at timestamptz,
 revision integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint freezer_meal_one_recipe check(num_nonnulls(household_recipe_id,imported_recipe_id)<=1),
 constraint freezer_meal_dates check(use_first_on is null or use_first_on>=frozen_on),
 constraint freezer_meal_household_unique unique(id,household_id)
);
create index freezer_meal_household_idx on cooksmith.freezer_meals(household_id);
create index freezer_meal_recipe_idx on cooksmith.freezer_meals(household_recipe_id);
create index freezer_meal_import_idx on cooksmith.freezer_meals(imported_recipe_id);
alter table cooksmith.planned_meals add column freezer_meal_id uuid;
alter table cooksmith.planned_meals add constraint planned_freezer_household_fk foreign key(freezer_meal_id,household_id) references cooksmith.freezer_meals(id,household_id);
alter table cooksmith.planned_meals add constraint planned_freezer_no_recipe check(freezer_meal_id is null or (recipe_id is null and imported_recipe_id is null));
create index planned_freezer_fk_idx on cooksmith.planned_meals(freezer_meal_id);
create table cooksmith.freezer_meal_reservations (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references cooksmith.households(id) on delete cascade,
 freezer_meal_id uuid not null, planned_meal_id uuid not null unique,
 portions integer not null constraint freezer_reservation_portions check(portions between 1 and 9999),
 state text not null default 'reserved' constraint freezer_reservation_state check(state in ('reserved','consumed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint freezer_reservation_stock_fk foreign key(freezer_meal_id,household_id) references cooksmith.freezer_meals(id,household_id) on delete cascade,
 constraint freezer_reservation_plan_fk foreign key(planned_meal_id,household_id) references cooksmith.planned_meals(id,household_id) on delete cascade
);
create index freezer_reservation_stock_idx on cooksmith.freezer_meal_reservations(freezer_meal_id);
create index freezer_reservation_household_idx on cooksmith.freezer_meal_reservations(household_id);
create table cooksmith.freezer_meal_events (
 id uuid primary key default gen_random_uuid(), household_id uuid not null references cooksmith.households(id) on delete cascade,
 freezer_meal_id uuid not null references cooksmith.freezer_meals(id) on delete cascade,
 planned_meal_id uuid,
 action text not null constraint freezer_event_action check(action in ('create','edit','archive','restore','reserve','consume','undo','release')),
 request jsonb not null, result jsonb not null,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index freezer_event_household_idx on cooksmith.freezer_meal_events(household_id);
create index freezer_event_stock_idx on cooksmith.freezer_meal_events(freezer_meal_id);
create index freezer_event_actor_idx on cooksmith.freezer_meal_events(actor_id);
alter table cooksmith.freezer_meals enable row level security;
alter table cooksmith.freezer_meal_reservations enable row level security;
alter table cooksmith.freezer_meal_events enable row level security;
grant select on cooksmith.freezer_meals,cooksmith.freezer_meal_reservations,cooksmith.freezer_meal_events to authenticated;
create policy freezer_meals_read_member on cooksmith.freezer_meals for select to authenticated using ((select cooksmith.is_active_household_member(household_id)));
create policy freezer_reservations_read_member on cooksmith.freezer_meal_reservations for select to authenticated using ((select cooksmith.is_active_household_member(household_id)));
create policy freezer_events_read_member on cooksmith.freezer_meal_events for select to authenticated using ((select cooksmith.is_active_household_member(household_id)));
create trigger freezer_meals_updated_at before update on cooksmith.freezer_meals for each row execute function cooksmith.set_updated_at();
create trigger freezer_reservations_updated_at before update on cooksmith.freezer_meal_reservations for each row execute function cooksmith.set_updated_at();

-- Direct planner edits may move a freezer entry, never forge/erase its provenance.
-- The private atomic command runs as the table owner; browser roles cannot do so.
create function cooksmith_private.guard_freezer_plan() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and ((tg_op='INSERT' and new.freezer_meal_id is not null) or (tg_op='UPDATE' and new.freezer_meal_id is distinct from old.freezer_meal_id)) then
   raise exception 'Use the freezer reservation command.' using errcode='42501';
 end if;
 return new;
end; $$;
create trigger guard_freezer_plan before insert or update on cooksmith.planned_meals for each row execute function cooksmith_private.guard_freezer_plan();
create function cooksmith_private.guard_freezer_shopping() returns trigger language plpgsql security invoker set search_path='' as $$
declare stock_id uuid;
begin
 select freezer_meal_id into stock_id from cooksmith.planned_meals where id=new.planned_meal_id for share;
 if stock_id is not null then
   raise exception 'Prepared freezer meals contribute no shopping ingredients.' using errcode='23514';
 end if;
 return new;
end; $$;
create trigger guard_freezer_shopping before insert or update on cooksmith.shopping_item_contributions for each row execute function cooksmith_private.guard_freezer_shopping();

create function cooksmith_private.freezer_command(p_household_id uuid,p_operation_id uuid,p_action text,p_freezer_id uuid,p_plan_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare stock cooksmith.freezer_meals; reservation cooksmith.freezer_meal_reservations; previous cooksmith.freezer_meal_events;
 reserved integer; requested integer; request_value jsonb; result_value jsonb; recipe_household uuid; recipe_import uuid; existing_plan cooksmith.planned_meals;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_operation_id is null or p_freezer_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' or p_action is null or p_action not in ('create','edit','archive','restore','reserve','consume','undo') then raise exception 'Invalid freezer command.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':freezer',0));
 if not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 request_value:=jsonb_build_object('action',p_action,'freezerId',p_freezer_id,'planId',p_plan_id,'payload',p_payload);
 select * into previous from cooksmith.freezer_meal_events where id=p_operation_id;
 if found then
   if previous.household_id<>p_household_id or previous.request<>request_value then raise exception 'Operation identifier was already used.' using errcode='23514'; end if;
   return previous.result;
 end if;
 if p_action<>'create' then
   select * into stock from cooksmith.freezer_meals where id=p_freezer_id and household_id=p_household_id for no key update;
   if not found then raise exception 'Freezer meal is unavailable.' using errcode='42501'; end if;
 end if;
 if p_action in ('create','edit') then
   requested:=(p_payload->>'portions')::integer;
   if requested is null or requested not between 0 and 9999 or p_payload->>'name' is null or p_payload->>'frozenOn' is null then raise exception 'Check freezer meal details.' using errcode='23514'; end if;
   recipe_household:=nullif(p_payload->>'householdRecipeId','')::uuid; recipe_import:=nullif(p_payload->>'importedRecipeId','')::uuid;
   if recipe_household is not null and not (p_action='edit' and recipe_household is not distinct from stock.household_recipe_id) and not exists(select 1 from cooksmith.household_recipes where id=recipe_household and household_id=p_household_id and archived_at is null) then raise exception 'Recipe is unavailable.' using errcode='42501'; end if;
   if recipe_import is not null and not (p_action='edit' and recipe_import is not distinct from stock.imported_recipe_id) and not exists(select 1 from cooksmith.imported_recipes where id=recipe_import and visibility='public' and archived_at is null) then raise exception 'Recipe is unavailable.' using errcode='42501'; end if;
   if p_action='create' then
     insert into cooksmith.freezer_meals(id,household_id,name,portions,frozen_on,use_first_on,notes,household_recipe_id,imported_recipe_id)
     values(p_freezer_id,p_household_id,btrim(p_payload->>'name'),requested,(p_payload->>'frozenOn')::date,nullif(p_payload->>'useFirstOn','')::date,nullif(p_payload->>'notes',''),recipe_household,recipe_import);
   else
     if (p_payload->>'revision')::integer is distinct from stock.revision then raise exception 'Stock changed. Refresh before editing.' using errcode='40001'; end if;
     select coalesce(sum(portions),0) into reserved from cooksmith.freezer_meal_reservations where freezer_meal_id=p_freezer_id and state='reserved';
     if requested<reserved then raise exception 'Stock cannot be lower than reserved portions.' using errcode='23514'; end if;
     update cooksmith.freezer_meals set name=btrim(p_payload->>'name'),portions=requested,frozen_on=(p_payload->>'frozenOn')::date,use_first_on=nullif(p_payload->>'useFirstOn','')::date,notes=nullif(p_payload->>'notes',''),household_recipe_id=recipe_household,imported_recipe_id=recipe_import,revision=revision+1 where id=p_freezer_id;
   end if;
 elsif p_action in ('archive','restore') then
   update cooksmith.freezer_meals set archived_at=case when p_action='archive' then coalesce(archived_at,now()) end,revision=revision+1 where id=p_freezer_id;
 elsif p_action='reserve' then
   requested:=(p_payload->>'portions')::integer;
   if p_plan_id is null or requested is null or requested not between 1 and 9999 or stock.archived_at is not null then raise exception 'Choose available freezer portions.' using errcode='23514'; end if;
   select coalesce(sum(portions),0) into reserved from cooksmith.freezer_meal_reservations where freezer_meal_id=p_freezer_id and state='reserved';
   if requested>stock.portions-reserved then raise exception 'Those portions were reserved elsewhere. Refresh and choose available stock.' using errcode='23514'; end if;
   -- Match the existing Shopping serialisation before replacing any generated contributions.
   perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':shopping',0));
   select * into existing_plan from cooksmith.planned_meals where id=p_plan_id for update;
   if found then
     if existing_plan.household_id<>p_household_id or existing_plan.freezer_meal_id is not null then raise exception 'Plan is not available for replacement.' using errcode='42501'; end if;
     delete from cooksmith.shopping_item_contributions where planned_meal_id=p_plan_id and household_id=p_household_id;
     update cooksmith.planned_meals set recipe_id=null,imported_recipe_id=null,freezer_meal_id=p_freezer_id,title=stock.name,meal_date=(p_payload->>'mealDate')::date,notes=nullif(p_payload->>'notes','') where id=p_plan_id;
   else
     insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title,notes,freezer_meal_id)
     values(p_plan_id,p_household_id,(p_payload->>'mealDate')::date,'dinner',stock.name,nullif(p_payload->>'notes',''),p_freezer_id);
   end if;
   insert into cooksmith.freezer_meal_reservations(household_id,freezer_meal_id,planned_meal_id,portions) values(p_household_id,p_freezer_id,p_plan_id,requested);
   update cooksmith.freezer_meals set revision=revision+1 where id=p_freezer_id;
 else
   perform 1 from cooksmith.planned_meals where id=p_plan_id and household_id=p_household_id and freezer_meal_id=p_freezer_id for update;
   if not found then raise exception 'Reserved plan is unavailable.' using errcode='42501'; end if;
   select * into reservation from cooksmith.freezer_meal_reservations where planned_meal_id=p_plan_id and freezer_meal_id=p_freezer_id and household_id=p_household_id for update;
   if not found then raise exception 'Reservation is unavailable.' using errcode='42501'; end if;
   if p_action='consume' and reservation.state='reserved' then
     update cooksmith.freezer_meals set portions=portions-reservation.portions,revision=revision+1 where id=p_freezer_id;
     update cooksmith.freezer_meal_reservations set state='consumed' where id=reservation.id;
   elsif p_action='undo' and reservation.state='consumed' then
     update cooksmith.freezer_meals set portions=portions+reservation.portions,revision=revision+1 where id=p_freezer_id;
     update cooksmith.freezer_meal_reservations set state='reserved' where id=reservation.id;
   end if;
 end if;
 result_value:=jsonb_build_object('freezerId',p_freezer_id,'planId',p_plan_id);
 insert into cooksmith.freezer_meal_events(id,household_id,freezer_meal_id,planned_meal_id,action,request,result,actor_id)
 values(p_operation_id,p_household_id,p_freezer_id,p_plan_id,p_action,request_value,result_value,auth.uid());
 return result_value;
end; $$;
create function cooksmith.freezer_command(p_household_id uuid,p_operation_id uuid,p_action text,p_freezer_id uuid,p_plan_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select cooksmith_private.freezer_command(p_household_id,p_operation_id,p_action,p_freezer_id,p_plan_id,p_payload); $$;
revoke all on function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb),cooksmith.freezer_command(uuid,uuid,text,uuid,uuid,jsonb),cooksmith_private.guard_freezer_plan(),cooksmith_private.guard_freezer_shopping() from public,anon,authenticated;
grant execute on function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb),cooksmith.freezer_command(uuid,uuid,text,uuid,uuid,jsonb) to authenticated;
comment on function cooksmith_private.freezer_command(uuid,uuid,text,uuid,uuid,jsonb) is 'Atomic freezer stock/plan/receipt boundary. Privileged because clients have SELECT-only stock access; checks auth.uid and active membership, scoped identifiers and serialises commands. Not a general RLS bypass.';
-- A plan deletion releases reservations, not physical stock; consumed portions stay consumed.
create function cooksmith_private.record_freezer_release() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from cooksmith.freezer_meals where id=old.freezer_meal_id and household_id=old.household_id) then
  insert into cooksmith.freezer_meal_events(household_id,freezer_meal_id,planned_meal_id,action,request,result,actor_id)
  values(old.household_id,old.freezer_meal_id,old.planned_meal_id,'release',jsonb_build_object('reservationId',old.id,'state',old.state,'portions',old.portions),jsonb_build_object('stockReturned',false),auth.uid());
 end if;
 return old;
end; $$;
revoke all on function cooksmith_private.record_freezer_release() from public,anon,authenticated;
create trigger record_freezer_release after delete on cooksmith.freezer_meal_reservations for each row execute function cooksmith_private.record_freezer_release();
commit;
