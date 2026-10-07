begin;
create table cooksmith.shopping_stock_purchases (
 id uuid primary key,
 household_id uuid not null references cooksmith.households(id) on delete cascade,
 name text not null constraint shopping_stock_purchase_name_valid check(char_length(btrim(name)) between 1 and 100),
 item_ids uuid[] not null constraint shopping_stock_purchase_items_valid check(cardinality(item_ids) between 1 and 100),
 source_keys text[] not null,
 source_quantities jsonb not null,
 amounts jsonb not null,
 consumed_amounts jsonb not null default '{}',
 revision integer not null default 0 constraint shopping_stock_purchase_revision_valid check(revision>=0),
 request jsonb not null,
 received_at timestamptz,
 voided_at timestamptz,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index shopping_stock_purchase_household_idx on cooksmith.shopping_stock_purchases(household_id,created_at);
create index shopping_stock_purchase_actor_idx on cooksmith.shopping_stock_purchases(actor_id);
alter table cooksmith.shopping_stock_purchases enable row level security;
revoke all on cooksmith.shopping_stock_purchases from public,anon,authenticated;
grant select on cooksmith.shopping_stock_purchases to authenticated;
create policy shopping_stock_purchase_read_member on cooksmith.shopping_stock_purchases for select to authenticated using((select cooksmith.is_active_household_member(household_id)));

create function cooksmith_private.record_shopping_stock_purchase(p_household_id uuid,p_operation_id uuid,p_name text,p_items jsonb,p_amounts jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare prior cooksmith.shopping_stock_purchases; item jsonb; amount jsonb; ids uuid[]:='{}'; row cooksmith.shopping_list_items; keys text[]; sources jsonb; request_value jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_operation_id is null or p_name is null or char_length(btrim(p_name)) not between 1 and 100 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 100 or jsonb_typeof(p_amounts) is distinct from 'array' or jsonb_array_length(p_amounts) not between 1 and 20 then raise exception 'Check the bought items.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':shopping',0));
 request_value:=jsonb_build_object('name',p_name,'items',p_items,'amounts',p_amounts);
 select * into prior from cooksmith.shopping_stock_purchases where id=p_operation_id;
 if found then
  if prior.household_id<>p_household_id or prior.request<>request_value then raise exception 'Operation identifier was already used.' using errcode='23514'; end if;
  return;
 end if;
 for item in select value from jsonb_array_elements(p_items) order by value->>'id' loop
  select * into row from cooksmith.shopping_list_items where id=(item->>'id')::uuid and household_id=p_household_id for update;
  if not found then raise exception 'Shopping item is unavailable.' using errcode='42501'; end if;
  if row.id=any(ids) or row.updated_at is distinct from (item->>'updatedAt')::timestamptz then raise exception 'Shopping changed. Refresh before marking it bought.' using errcode='PT409'; end if;
  ids:=array_append(ids,row.id);
 end loop;
 for amount in select value from jsonb_array_elements(p_amounts) loop
  if jsonb_typeof(amount)<>'object' or (amount->>'quantity' is not null and ((amount->>'quantity')::numeric<0 or (amount->>'quantity')::numeric>99999 or (amount->>'quantity')::numeric::text in ('NaN','Infinity','-Infinity'))) or char_length(coalesce(amount->>'unit',''))>40 then raise exception 'Check the bought amounts.' using errcode='23514'; end if;
 end loop;
 select coalesce(array_agg(case when c.id is null then 'm:'||i.id::text else 'c:'||c.id::text end),'{}'),coalesce(jsonb_agg(jsonb_build_object('plannedMealId',c.planned_meal_id,'sources',c.source_quantities)),'[]') into keys,sources
 from cooksmith.shopping_list_items i left join cooksmith.shopping_item_contributions c on c.shopping_item_id=i.id and c.household_id=i.household_id where i.id=any(ids) and i.household_id=p_household_id;
 insert into cooksmith.shopping_stock_purchases(id,household_id,name,item_ids,source_keys,source_quantities,amounts,request,actor_id) values(p_operation_id,p_household_id,btrim(p_name),ids,keys,sources,p_amounts,request_value,auth.uid());
 update cooksmith.shopping_list_items set completed=true where id=any(ids) and household_id=p_household_id;
end; $$;
create function cooksmith.record_shopping_stock_purchase(p_household_id uuid,p_operation_id uuid,p_name text,p_items jsonb,p_amounts jsonb)
returns void language sql security invoker set search_path='' as $$ select cooksmith_private.record_shopping_stock_purchase(p_household_id,p_operation_id,p_name,p_items,p_amounts); $$;
revoke all on function cooksmith_private.record_shopping_stock_purchase(uuid,uuid,text,jsonb,jsonb),cooksmith.record_shopping_stock_purchase(uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function cooksmith_private.record_shopping_stock_purchase(uuid,uuid,text,jsonb,jsonb),cooksmith.record_shopping_stock_purchase(uuid,uuid,text,jsonb,jsonb) to authenticated;

-- Only a deliberate user correction cancels procurement. Recipe regeneration can
-- change a checkbox, but must never pretend physically bought food disappeared.
create function cooksmith_private.unbuy_shopping_stock(p_household_id uuid,p_item_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_item_ids is null or cardinality(p_item_ids) not between 1 and 100 then raise exception 'Choose bought items.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':shopping',0));
 if exists(select 1 from cooksmith.shopping_stock_purchases where household_id=p_household_id and item_ids&&p_item_ids and not item_ids<@p_item_ids and received_at is null and voided_at is null) then raise exception 'This purchase was grouped. Refresh before changing it.' using errcode='PT409'; end if;
 if exists(select 1 from cooksmith.shopping_stock_purchases p, lateral jsonb_each_text(p.consumed_amounts) c where p.household_id=p_household_id and p.item_ids&&p_item_ids and p.received_at is null and p.voided_at is null and c.value::numeric>0) then raise exception 'Undo dinners using this purchase before unmarking it.' using errcode='PT412'; end if;
 perform cooksmith.set_shopping_purchase_completed(p_household_id,p_item_ids,false);
 update cooksmith.shopping_stock_purchases set voided_at=now(),revision=revision+1 where household_id=p_household_id and item_ids&&p_item_ids and received_at is null and voided_at is null;
end; $$;
create function cooksmith.unbuy_shopping_stock(p_household_id uuid,p_item_ids uuid[]) returns void language sql security invoker set search_path='' as $$ select cooksmith_private.unbuy_shopping_stock(p_household_id,p_item_ids); $$;
revoke all on function cooksmith_private.unbuy_shopping_stock(uuid,uuid[]),cooksmith.unbuy_shopping_stock(uuid,uuid[]) from public,anon,authenticated;
grant execute on function cooksmith_private.unbuy_shopping_stock(uuid,uuid[]),cooksmith.unbuy_shopping_stock(uuid,uuid[]) to authenticated;

create function cooksmith_private.receive_measured_shopping(p_household_id uuid,p_operation_id uuid,p_choices jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare prior cooksmith.shopping_put_away_batches; choice jsonb; source jsonb; purchase cooksmith.shopping_stock_purchases;
 stock cooksmith.household_pantry_items; target uuid; target_name text; q numeric; u text; factor numeric; stock_factor numeric; dimension text; stock_dimension text;
 selected_ids uuid[]:='{}'; applied integer:=0; item_count integer:=0; result_value jsonb; existing boolean;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(p_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if p_operation_id is null or jsonb_typeof(p_choices) is distinct from 'array' or jsonb_array_length(p_choices) not between 1 and 100 then raise exception 'Check the selected purchases.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_household_id::text||':shopping',0));
 select * into prior from cooksmith.shopping_put_away_batches where id=p_operation_id;
 if found then
  if prior.household_id<>p_household_id or prior.request<>p_choices then raise exception 'Operation identifier was already used.' using errcode='23514'; end if;
  return prior.result;
 end if;
 insert into cooksmith.shopping_put_away_batches(id,household_id,request,result,actor_id) values(p_operation_id,p_household_id,p_choices,'{}',auth.uid());
 for choice in select value from jsonb_array_elements(p_choices) loop
  target_name:=btrim(choice->>'name');
  if target_name is null or char_length(target_name) not between 1 and 100 or jsonb_typeof(choice->'sources') is distinct from 'array' or jsonb_array_length(choice->'sources')=0 then raise exception 'Check the purchase name and sources.' using errcode='23514'; end if;
  for source in select value from jsonb_array_elements(choice->'sources') loop
   if source->>'key' not like 'p:%' then raise exception 'Reopen the measured purchase review.' using errcode='PT409'; end if;
   select * into purchase from cooksmith.shopping_stock_purchases where id=substring(source->>'key' from 3)::uuid and household_id=p_household_id for update;
   if not found then raise exception 'Purchase is unavailable.' using errcode='42501'; end if;
   if purchase.id=any(selected_ids) or purchase.received_at is not null or purchase.voided_at is not null or md5(jsonb_build_array(purchase.request,purchase.consumed_amounts,purchase.revision)::text) is distinct from source->>'token' then raise exception 'Purchase changed. Reopen the review.' using errcode='PT409'; end if;
   selected_ids:=array_append(selected_ids,purchase.id);
  end loop;
  select * into stock from cooksmith.household_pantry_items where household_id=p_household_id and normalised_name=lower(target_name) for update;
  existing:=found;
  q:=(choice->>'quantity')::numeric; u:=nullif(btrim(choice->>'unit'),'');
  if q is not null and (q<0 or q>99999 or q::text in ('NaN','Infinity','-Infinity') or q<>round(q,2)) then raise exception 'Check the measured quantity.' using errcode='23514'; end if;
  if existing then
   if stock.updated_at is distinct from (choice->>'pantryUpdatedAt')::timestamptz then raise exception 'Pantry changed. Reopen the review.' using errcode='PT409'; end if;
   target:=stock.id;
   -- Unknown totals remain unknown. The received amount is retained in the request,
   -- but is never added to an invented zero baseline.
   if q is not null and stock.quantity is not null then
    select d,f into dimension,factor from cooksmith_private.exact_stock_measure(u);
    select d,f into stock_dimension,stock_factor from cooksmith_private.exact_stock_measure(stock.unit);
    if dimension is null or dimension is distinct from stock_dimension or q*factor/stock_factor<>round(q*factor/stock_factor,2) then raise exception 'The received unit needs a Pantry check.' using errcode='23514'; end if;
    update cooksmith.household_pantry_items set quantity=quantity+q*factor/stock_factor,quantity_untracked=quantity_untracked or coalesce((choice->>'quantityUntracked')::boolean,false),available=quantity+q*factor/stock_factor>0 or quantity_untracked where id=target;
   elsif q is not null and stock.quantity is null then
    -- A confirmed receipt establishes a lower bound without inventing the old amount.
    update cooksmith.household_pantry_items set quantity=q,unit=u,quantity_untracked=true,available=true where id=target;
   else update cooksmith.household_pantry_items set quantity_untracked=true,available=true where id=target; end if;
  else
   if choice->>'pantryUpdatedAt' is not null then raise exception 'Pantry changed. Reopen the review.' using errcode='PT409'; end if;
   insert into cooksmith.household_pantry_items(household_id,name,category,category_source,storage_location,storage_location_source,classification_version,quantity,unit,available,quantity_untracked)
   values(p_household_id,target_name,(choice->>'category')::cooksmith.pantry_item_category,'automatic',(choice->>'storageLocation')::cooksmith.pantry_storage_location,'automatic',1,q,u,q is null or q>0,coalesce((choice->>'quantityUntracked')::boolean,false)) returning id into target;
  end if;
  for source in select value from jsonb_array_elements(choice->'sources') loop
   select * into purchase from cooksmith.shopping_stock_purchases where id=substring(source->>'key' from 3)::uuid and household_id=p_household_id;
   update cooksmith.shopping_stock_purchases set received_at=now(),revision=revision+1 where id=purchase.id;
   insert into cooksmith.shopping_put_away_receipts(household_id,source_key,shopping_item_id,source_quantities,pantry_item_id,pantry_name,batch_id) values(p_household_id,source->>'key',purchase.item_ids[1],purchase.source_quantities,target,target_name,p_operation_id);
   applied:=applied+1;
  end loop;
  item_count:=item_count+1;
 end loop;
 result_value:=jsonb_build_object('appliedSources',applied,'alreadyAppliedSources',0,'pantryItems',item_count);
 update cooksmith.shopping_put_away_batches set result=result_value where id=p_operation_id;
 return result_value;
end; $$;
create function cooksmith_private.exact_stock_measure(p_unit text) returns table(d text,f numeric)
language sql immutable security invoker set search_path='' as $$
 select case when lower(btrim(p_unit)) in ('g','gram','grams','kg','kilogram','kilograms') then 'mass' when lower(btrim(p_unit)) in ('ml','millilitre','millilitres','milliliter','milliliters','l','litre','litres','liter','liters') then 'volume' when lower(btrim(p_unit)) in ('each','whole','count','item','items') then 'count' end,
 case when lower(btrim(p_unit)) in ('kg','kilogram','kilograms','l','litre','litres','liter','liters') then 1000::numeric else 1::numeric end;
$$;
revoke all on function cooksmith_private.exact_stock_measure(text) from public,anon,authenticated;
create function cooksmith.receive_measured_shopping(p_household_id uuid,p_operation_id uuid,p_choices jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select cooksmith_private.receive_measured_shopping(p_household_id,p_operation_id,p_choices); $$;
revoke all on function cooksmith_private.receive_measured_shopping(uuid,uuid,jsonb),cooksmith.receive_measured_shopping(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function cooksmith_private.receive_measured_shopping(uuid,uuid,jsonb),cooksmith.receive_measured_shopping(uuid,uuid,jsonb) to authenticated;
create function cooksmith.measured_shopping_sources(p_household_id uuid)
returns table(id uuid,name text,item_ids uuid[],amounts jsonb,snapshot_token text)
language sql stable security invoker set search_path='' as $$
 select p.id,p.name,p.item_ids,(select jsonb_agg(a.value||jsonb_build_object('quantity',case when a.value->>'quantity' is null then null else greatest(0,(a.value->>'quantity')::numeric-coalesce((p.consumed_amounts->>(a.ordinality-1)::text)::numeric,0)) end) order by a.ordinality) from jsonb_array_elements(p.amounts) with ordinality a),md5(jsonb_build_array(p.request,p.consumed_amounts,p.revision)::text) from cooksmith.shopping_stock_purchases p
 where p.household_id=p_household_id and p.received_at is null and p.voided_at is null and auth.uid() is not null and cooksmith.is_active_household_member(p_household_id)
 order by p.created_at,p.id;
$$;
revoke all on function cooksmith.measured_shopping_sources(uuid) from public,anon;
grant execute on function cooksmith.measured_shopping_sources(uuid) to authenticated;
commit;
