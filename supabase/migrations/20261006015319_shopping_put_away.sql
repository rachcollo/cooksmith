begin;
create table cooksmith.shopping_put_away_batches (
 id uuid primary key,
 household_id uuid not null references cooksmith.households(id) on delete cascade,
 request jsonb not null, result jsonb not null,
 actor_id uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index shopping_put_away_batch_household_idx on cooksmith.shopping_put_away_batches(household_id);
create index shopping_put_away_batch_actor_idx on cooksmith.shopping_put_away_batches(actor_id);
create table cooksmith.shopping_put_away_receipts (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references cooksmith.households(id) on delete cascade,
 source_key text not null,
 shopping_item_id uuid not null,
 contribution_id uuid,
 planned_meal_id uuid,
 source_quantities jsonb not null,
 pantry_item_id uuid references cooksmith.household_pantry_items(id) on delete set null,
 pantry_name text not null,
 batch_id uuid not null references cooksmith.shopping_put_away_batches(id),
 created_at timestamptz not null default now(),
 constraint shopping_put_away_source_unique unique(household_id,source_key)
);
-- Source identifiers are historical, deliberately not cascading references. Clearing
-- Shopping or deleting a recipe must never erase evidence that stock was applied.
create index shopping_put_away_receipt_item_idx on cooksmith.shopping_put_away_receipts(shopping_item_id);
create index shopping_put_away_receipt_plan_idx on cooksmith.shopping_put_away_receipts(household_id,planned_meal_id);
create index shopping_put_away_receipt_pantry_idx on cooksmith.shopping_put_away_receipts(pantry_item_id);
create index shopping_put_away_receipt_batch_idx on cooksmith.shopping_put_away_receipts(batch_id);
alter table cooksmith.shopping_put_away_batches enable row level security;
alter table cooksmith.shopping_put_away_receipts enable row level security;
revoke all on cooksmith.shopping_put_away_batches,cooksmith.shopping_put_away_receipts from anon,authenticated;
grant select on cooksmith.shopping_put_away_batches,cooksmith.shopping_put_away_receipts to authenticated;
create policy shopping_put_away_batches_read_member on cooksmith.shopping_put_away_batches for select to authenticated using((select cooksmith.is_active_household_member(household_id)));
create policy shopping_put_away_receipts_read_member on cooksmith.shopping_put_away_receipts for select to authenticated using((select cooksmith.is_active_household_member(household_id)));

create function cooksmith.shopping_put_away_sources(target_household_id uuid)
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
 )) order by s.name,s.source_key;
$$;
revoke all on function cooksmith.shopping_put_away_sources(uuid) from public,anon;
grant execute on function cooksmith.shopping_put_away_sources(uuid) to authenticated;

create function cooksmith_private.put_shopping_away(target_household_id uuid,operation_id uuid,reviewed_items jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous cooksmith.shopping_put_away_batches; choice jsonb; source jsonb; candidate record;
 seen text[]:='{}'; applied integer:=0; already_applied integer:=0; pantry_ids uuid[]:='{}'; target_pantry uuid;
 available_sources jsonb; pantry_name text; identity_name text; match_count integer; result_value jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(target_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 if operation_id is null or reviewed_items is null or jsonb_typeof(reviewed_items)<>'array' or jsonb_array_length(reviewed_items) not between 1 and 100 then raise exception 'Review the selected items.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_household_id::text||':shopping',0));
 if not cooksmith.is_active_household_member(target_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 select * into previous from cooksmith.shopping_put_away_batches where id=operation_id;
 if found then
  if previous.household_id<>target_household_id or previous.request<>reviewed_items then raise exception 'Operation identifier was already used.' using errcode='23514'; end if;
  return previous.result;
 end if;
 -- Serialise with completion, removal, overrides and CS-101 refresh. Do not mutate
 -- any contribution, Shopping quantity, override or bought state during put-away.
 perform 1 from cooksmith.shopping_list_items where household_id=target_household_id order by id for update;
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into available_sources from cooksmith.shopping_put_away_sources(target_household_id) s;
 insert into cooksmith.shopping_put_away_batches(id,household_id,request,result,actor_id) values(operation_id,target_household_id,reviewed_items,'{}',auth.uid());
 for choice in select value from jsonb_array_elements(reviewed_items) loop
  pantry_name:=btrim(choice->>'name'); identity_name:=cooksmith.canonical_ingredient_name_v1(pantry_name);
  if pantry_name is null or char_length(pantry_name) not between 1 and 100 or identity_name='' or jsonb_typeof(choice->'sources') is distinct from 'array' or jsonb_array_length(choice->'sources')=0 then raise exception 'Review the item name and selected purchases.' using errcode='23514'; end if;
  target_pantry:=null;
  for source in select value from jsonb_array_elements(choice->'sources') loop
   if source->>'key' is null or source->>'key'=any(seen) or cardinality(seen)>=500 then raise exception 'Invalid or repeated purchase source.' using errcode='23514'; end if;
   seen:=array_append(seen,source->>'key');
   if exists(select 1 from cooksmith.shopping_put_away_receipts where household_id=target_household_id and source_key=source->>'key') then
    already_applied:=already_applied+1; continue;
   end if;
   select * into candidate from jsonb_to_recordset(available_sources) as s(source_key text,shopping_item_id uuid,contribution_id uuid,planned_meal_id uuid,name text,source_quantities jsonb,snapshot_token text) where s.source_key=source->>'key';
   if not found or candidate.snapshot_token is distinct from source->>'token' then raise exception 'Shopping changed. Refresh the review before applying.' using errcode='PT409'; end if;
   if target_pantry is null then
    select id into target_pantry from cooksmith.household_pantry_items where household_id=target_household_id and normalised_name=lower(pantry_name) for update;
    if not found then
     select count(*) into match_count from cooksmith.household_pantry_items where household_id=target_household_id and cooksmith.canonical_ingredient_name_v1(name)=identity_name;
     if match_count>1 then raise exception 'Several Pantry items match. Use the exact Pantry name.' using errcode='23514'; end if;
     select id into target_pantry from cooksmith.household_pantry_items where household_id=target_household_id and cooksmith.canonical_ingredient_name_v1(name)=identity_name for update;
    end if;
    if target_pantry is null then
     insert into cooksmith.household_pantry_items(household_id,name,category,category_source,storage_location,storage_location_source,classification_version,quantity,unit,available)
     values(target_household_id,pantry_name,(choice->>'category')::cooksmith.pantry_item_category,'automatic',(choice->>'storageLocation')::cooksmith.pantry_storage_location,'automatic',1,null,null,true)
     on conflict(household_id,normalised_name) do update set available=true returning id into target_pantry;
    else
     update cooksmith.household_pantry_items set available=true where id=target_pantry and household_id=target_household_id;
    end if;
    if not target_pantry=any(pantry_ids) then pantry_ids:=array_append(pantry_ids,target_pantry); end if;
   end if;
   insert into cooksmith.shopping_put_away_receipts(household_id,source_key,shopping_item_id,contribution_id,planned_meal_id,source_quantities,pantry_item_id,pantry_name,batch_id)
   values(target_household_id,candidate.source_key,candidate.shopping_item_id,candidate.contribution_id,candidate.planned_meal_id,candidate.source_quantities,target_pantry,pantry_name,operation_id);
   applied:=applied+1;
  end loop;
 end loop;
 result_value:=jsonb_build_object('appliedSources',applied,'alreadyAppliedSources',already_applied,'pantryItems',cardinality(pantry_ids));
 update cooksmith.shopping_put_away_batches set result=result_value where id=operation_id;
 return result_value;
end; $$;
create function cooksmith.put_shopping_away(target_household_id uuid,operation_id uuid,reviewed_items jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select cooksmith_private.put_shopping_away(target_household_id,operation_id,reviewed_items); $$;
revoke all on function cooksmith_private.put_shopping_away(uuid,uuid,jsonb),cooksmith.put_shopping_away(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function cooksmith_private.put_shopping_away(uuid,uuid,jsonb),cooksmith.put_shopping_away(uuid,uuid,jsonb) to authenticated;
comment on function cooksmith_private.put_shopping_away(uuid,uuid,jsonb) is 'Narrow atomic Pantry/receipt boundary: receipt tables are SELECT-only to clients; derives auth.uid and validates active membership, source household and reviewed snapshot. Never changes shopping completion or ingredient quantities.';
commit;
