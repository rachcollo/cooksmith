begin;
create temporary table cs116_v1_contracts on commit drop as select p.oid,pg_get_functiondef(p.oid) definition,p.proacl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('cooksmith','cooksmith_private');
-- v1 storage keys remain immutable. v2 is a purchasing projection over stable rows:
-- legacy aliases can coexist, preserving receipt item_ids and c:<contribution-id> keys.
create function cooksmith.canonical_ingredient_name_v2(value text)
returns text language plpgsql immutable strict security invoker set search_path='' as $$
declare name text := btrim(regexp_replace(regexp_replace(lower(normalize(value,NFKC)), '[^[:alnum:][:space:]]+', ' ', 'g'), '\s+', ' ', 'g')); word text; words text[] := '{}'::text[];
begin
 if name ~ '[0-9]' then return name; end if;
 foreach word in array string_to_array(name,' ') loop
  word := case word
   when 'asparagus' then 'asparagus'
   when 'couscous' then 'couscous'
   when 'hummus' then 'hummus'
   when 'molasses' then 'molasses'
   when 'watercress' then 'watercress'
   when 'cress' then 'cress'
   when 'bass' then 'bass'
   when 'citrus' then 'citrus'
   when 'grass' then 'grass'
   when 'lemongrass' then 'lemongrass'
   when 'oats' then 'oats'
   when 'news' then 'news'
   when 'swiss' then 'swiss'
   when 'mangoes' then 'mango'
   when 'quiches' then 'quiche'
   when 'mousses' then 'mousse'
   when 'potatoes' then 'potato'
   when 'tomatoes' then 'tomato'
   when 'chillies' then 'chilli'
   when 'chilis' then 'chilli'
   when 'leaves' then 'leaf'
   when 'loaves' then 'loaf'
   when 'halves' then 'half'
   when 'knives' then 'knife'
   when 'anchovies' then 'anchovy'
   when 'cookies' then 'cookie'
   when 'brownies' then 'brownie'
   else case
    when word ~ '(ss|us|is)$' then word
    when word ~ '[^aeiou]ies$' then left(word,-3)||'y'
    when word ~ '(ches|shes|xes|zzes|sses)$' then left(word,-2)
    when length(word)>3 and word ~ 's$' then left(word,-1)
    else word end end;
  words := array_append(words,word);
 end loop;
 name := '';
 foreach word in array words loop
  name := name || case when name='' then '' else ' ' end || word;
 end loop;
 name := regexp_replace(name,'\mbell pepper\M','capsicum','g');
 name := regexp_replace(name,'\mcourgette\M','zucchini','g');
 name := regexp_replace(name,'\maubergine\M','eggplant','g');
 name := regexp_replace(name,'\mcilantro\M','coriander','g');
 name := regexp_replace(name,'\myogurt\M','yoghurt','g');
 name := regexp_replace(name,'\mscallion\M','spring onion','g');
 name := regexp_replace(name,'\mgreen onion\M','spring onion','g');
 name := regexp_replace(name,'\marugula\M','rocket','g');
 name := regexp_replace(name,'\mmangetout\M','snow pea','g');
 name := regexp_replace(name,'\mgarbanzo bean\M','chickpea','g');
 name := regexp_replace(name,'\mshrimp\M','prawn','g');
 name := regexp_replace(name,'\mconfectioner sugar\M','icing sugar','g');
 name := regexp_replace(name,'\mpowdered sugar\M','icing sugar','g');
 name := regexp_replace(name,'\mall purpose flour\M','plain flour','g');
 name := regexp_replace(name,'\mself rising flour\M','self raising flour','g');
 name := regexp_replace(name,'\mevoo\M','extra virgin olive oil','g');
 if name !~ '\m(frozen|canned|tinned|jar|jarred|pre|ready|packet|packaged|dried|powder|paste)\M'
 and name ~ '\m(onion|carrot|potato|capsicum|zucchini|celery|garlic|ginger|chilli)\M' then
  name := btrim(regexp_replace(regexp_replace(name,'\m(finely|roughly|thinly|thickly|diced|sliced|chopped|grated)\M',' ','g'),'\s+',' ','g'));
 end if;
 return name;
end; $$;
revoke all on function cooksmith.canonical_ingredient_name_v2(text) from public,anon;
grant execute on function cooksmith.canonical_ingredient_name_v2(text) to authenticated,service_role;
create index shopping_identity_v2_lookup on cooksmith.shopping_list_items(household_id,cooksmith.canonical_ingredient_name_v2(display_name),unit_identity) where not manual;

-- Compare effective purchase units while tolerating legacy sources that predate
-- the explicit purchaseUnit field. Original units and all quantity evidence remain.
create function cooksmith_private.purchase_source_evidence_v2(source jsonb)
returns jsonb language sql immutable security invoker set search_path='' as $$
 select (source - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion','purchaseIdentityV2','purchaseQuantity'])
 || jsonb_build_object('purchaseUnit',coalesce(source->>'purchaseUnit',cooksmith.purchase_unit_v3(source->>'unit')));
$$;
revoke all on function cooksmith_private.purchase_source_evidence_v2(jsonb) from public,anon;
grant execute on function cooksmith_private.purchase_source_evidence_v2(jsonb) to authenticated;

-- This helper runs only after the caller's household lock and authorisation.
-- Equal source multisets and totals prove that this is identity-only, not a
-- recipe/quantity repair. Never delete/reinsert source rows to change a label.
create function cooksmith_private.refresh_purchase_identity_v2(target_household_id uuid,target_planned_meal_id uuid,ingredient_inputs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_sources jsonb; new_sources jsonb; old_totals jsonb; new_totals jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(target_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
 select jsonb_agg(cooksmith_private.purchase_source_evidence_v2(s.value) order by (cooksmith_private.purchase_source_evidence_v2(s.value))::text)
 into old_sources from cooksmith.shopping_item_contributions c cross join lateral jsonb_array_elements(c.source_quantities) s
 where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id;
 select jsonb_agg(cooksmith_private.purchase_source_evidence_v2(s.value) order by (cooksmith_private.purchase_source_evidence_v2(s.value))::text)
 into new_sources from jsonb_array_elements(ingredient_inputs) i cross join lateral jsonb_array_elements(i->'sourceQuantities') s;
 if old_sources is null or old_sources is distinct from new_sources then return false; end if;
 select jsonb_agg(to_jsonb(t) order by name,unit) into old_totals from (
  -- A household override may rename the purchase without changing recipe demand.
  -- Compare its unambiguous source product, not the shopper's display label.
  select case when i.plan_override then coalesce((
    select min(cooksmith.canonical_ingredient_name_v2(coalesce(s->>'purchaseName',s->>'name')))
    from jsonb_array_elements(c.source_quantities) s
    having count(distinct cooksmith.canonical_ingredient_name_v2(coalesce(s->>'purchaseName',s->>'name')))=1
  ),cooksmith.canonical_ingredient_name_v2(i.display_name))
  else cooksmith.canonical_ingredient_name_v2(i.display_name) end name,coalesce(c.unit,'') unit,
   case when count(c.quantity)=count(*) then sum(c.quantity) else null end quantity
  from cooksmith.shopping_item_contributions c join cooksmith.shopping_list_items i on i.id=c.shopping_item_id
  where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id
  group by 1,2
 ) t;
 select jsonb_agg(to_jsonb(t) order by name,unit) into new_totals from (
  select cooksmith.canonical_ingredient_name_v2(i->>'name') name,coalesce(i->>'unit','') unit,
   case when count(i->>'quantity')=count(*) then sum((i->>'quantity')::numeric) else null end quantity
  from jsonb_array_elements(ingredient_inputs) i group by 1,2
 ) t;
 if old_totals is distinct from new_totals then return false; end if;
 -- A repeated call is a true no-op, including optimistic-lock timestamps.
 if (select jsonb_agg(s.value order by s.value::text) from cooksmith.shopping_item_contributions c cross join lateral jsonb_array_elements(c.source_quantities) s where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id)
 is not distinct from (select jsonb_agg(s.value order by s.value::text) from jsonb_array_elements(ingredient_inputs) i cross join lateral jsonb_array_elements(i->'sourceQuantities') s) then return true; end if;
 update cooksmith.shopping_item_contributions c set source_quantities=(
  select jsonb_agg((select incoming.value from jsonb_array_elements(ingredient_inputs) i cross join lateral jsonb_array_elements(i->'sourceQuantities') incoming
    where cooksmith_private.purchase_source_evidence_v2(incoming.value) = cooksmith_private.purchase_source_evidence_v2(s.value) limit 1) order by s.ordinality)
  from jsonb_array_elements(c.source_quantities) with ordinality s
 ) where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id;
 return true;
end; $$;
revoke all on function cooksmith_private.refresh_purchase_identity_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith_private.refresh_purchase_identity_v2(uuid,uuid,jsonb) to authenticated;

create function cooksmith.shopping_sources_overlap_v2(left_sources jsonb,right_sources jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
 select exists(select 1 from jsonb_array_elements(left_sources) l,jsonb_array_elements(right_sources) r
 where (l->>'sourceRecipeId' is null or r->>'sourceRecipeId' is null
   or (l->>'sourceRecipeId'=r->>'sourceRecipeId' and l->>'sourceRecipeKind'=r->>'sourceRecipeKind'))
 and (cooksmith.canonical_ingredient_name_v2(coalesce(l->>'purchaseName',l->>'name'))=cooksmith.canonical_ingredient_name_v2(coalesce(r->>'purchaseName',r->>'name'))
   or exists(select 1 from jsonb_array_elements_text(coalesce(r->'legacyPurchaseNames','[]')) alias where cooksmith.canonical_ingredient_name_v2(alias)=cooksmith.canonical_ingredient_name_v2(l->>'name'))
   or exists(select 1 from jsonb_array_elements_text(coalesce(l->'legacyPurchaseNames','[]')) alias where cooksmith.canonical_ingredient_name_v2(alias)=cooksmith.canonical_ingredient_name_v2(r->>'name')))
 and (cooksmith.purchase_unit_v3(l->>'unit')=cooksmith.purchase_unit_v3(r->>'unit')
   or coalesce(l->>'purchaseUnit',cooksmith.purchase_unit_v3(l->>'unit'))=coalesce(r->>'purchaseUnit',cooksmith.purchase_unit_v3(r->>'unit'))));
$$;

-- v2 is an explicit API. Shared v1 functions, triggers and storage keys stay intact.
-- Partition physical rows by v1 source product, even when v2 groups the purchase.
create function cooksmith.reconcile_planned_meal_shopping_v2(target_household_id uuid,target_planned_meal_id uuid,ingredient_inputs jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; source jsonb; total numeric; physical_inputs jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(target_household_id)
 or not exists(select 1 from cooksmith.planned_meals where id=target_planned_meal_id and household_id=target_household_id) then
  raise exception 'Active membership and a meal in this household are required.' using errcode='42501'; end if;
 if ingredient_inputs is null or jsonb_typeof(ingredient_inputs)<>'array' or jsonb_array_length(ingredient_inputs)>500 then raise exception 'Invalid ingredient inputs.' using errcode='23514'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_household_id::text||':shopping',0));
 for item in select value from jsonb_array_elements(ingredient_inputs) loop
  if jsonb_typeof(item->'sourceQuantities') is distinct from 'array' or jsonb_array_length(item->'sourceQuantities') not between 1 and 500 then raise exception 'Invalid v2 source evidence.' using errcode='23514'; end if;
  for source in select value from jsonb_array_elements(item->'sourceQuantities') loop
   if source->>'ingredientIdentityVersion' is distinct from '2' or not (source ? 'purchaseQuantity')
    or source->>'purchaseName' is null or btrim(source->>'purchaseName')=''
    or cooksmith.canonical_ingredient_name_v2(source->>'purchaseName') is distinct from cooksmith.canonical_ingredient_name_v2(item->>'name')
    or coalesce(source->>'purchaseUnit','') is distinct from coalesce(item->>'unit','')
    or (source->>'purchaseQuantity' is not null and ((source->>'purchaseQuantity')::numeric<0 or (source->>'purchaseQuantity')::numeric>99999 or source->>'purchaseQuantity' in ('NaN','Infinity','-Infinity'))) then
     raise exception 'Invalid v2 source evidence.' using errcode='23514'; end if;
  end loop;
  select case when count(s->>'purchaseQuantity')=count(*) then sum((s->>'purchaseQuantity')::numeric) else null end into total from jsonb_array_elements(item->'sourceQuantities') s;
  if total is distinct from (item->>'quantity')::numeric then raise exception 'Purchase amount does not match source evidence.' using errcode='23514'; end if;
 end loop;
 if cooksmith_private.refresh_purchase_identity_v2(target_household_id,target_planned_meal_id,ingredient_inputs) then return; end if;
 if exists(select 1 from cooksmith.shopping_item_contributions c where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id
  and (exists(select 1 from cooksmith.shopping_stock_purchases p where p.household_id=target_household_id and (c.shopping_item_id=any(p.item_ids) or ('c:'||c.id::text)=any(p.source_keys)))
   or exists(select 1 from cooksmith.shopping_put_away_receipts r where r.household_id=target_household_id and (r.shopping_item_id=c.shopping_item_id or r.source_key='c:'||c.id::text)))) then
  raise exception 'Purchased source evidence requires a separate repair.' using errcode='PT409'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',s->>'purchaseName','quantity',s->'purchaseQuantity','unit',i->'unit','category',i->'category','sourceQuantities',jsonb_build_array(s))),'[]') into physical_inputs
 from jsonb_array_elements(ingredient_inputs) i cross join lateral jsonb_array_elements(i->'sourceQuantities') s;
 perform cooksmith.reconcile_planned_meal_shopping(target_household_id,target_planned_meal_id,physical_inputs);
end; $$;
revoke all on function cooksmith.reconcile_planned_meal_shopping_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith.reconcile_planned_meal_shopping_v2(uuid,uuid,jsonb) to authenticated;
do $refresh$
declare definition text; needle text;
begin
 definition := pg_get_functiondef('cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)'::regprocedure);
 definition := replace(definition, 'FUNCTION cooksmith.refresh_shopping_ingredient_structure(', 'FUNCTION cooksmith.refresh_shopping_ingredient_structure_v2(');
 needle := '    update cooksmith.shopping_list_items set completed=(';
 if position(needle in definition)=0 then raise exception 'Missing refresh completion restoration'; end if;
 definition := replace(definition,needle,$guard$    if exists(select 1 from jsonb_array_elements(previous_items) old
      where old->>'id'=current_item.id::text
      and (select jsonb_agg(cooksmith_private.purchase_source_evidence_v2(s) order by (cooksmith_private.purchase_source_evidence_v2(s))::text) from jsonb_array_elements(old->'sources') s)
       = (select jsonb_agg(cooksmith_private.purchase_source_evidence_v2(s) order by (cooksmith_private.purchase_source_evidence_v2(s))::text) from jsonb_array_elements(current_item.sources) s)) then continue; end if;
$guard$ || needle);
 definition := replace(definition,'cooksmith.reconcile_planned_meal_shopping(', 'cooksmith.reconcile_planned_meal_shopping_v2(');
 definition := replace(definition,'cooksmith.shopping_sources_overlap(', 'cooksmith.shopping_sources_overlap_v2(');
 execute definition;
end;
$refresh$;


revoke all on function cooksmith.shopping_sources_overlap_v2(jsonb,jsonb),cooksmith.refresh_shopping_ingredient_structure_v2(uuid,jsonb) from public,anon;
grant execute on function cooksmith.shopping_sources_overlap_v2(jsonb,jsonb),cooksmith.refresh_shopping_ingredient_structure_v2(uuid,jsonb) to authenticated;
create index pantry_identity_v2_lookup on cooksmith.household_pantry_items(household_id,cooksmith.canonical_ingredient_name_v2(name));
-- V2 write boundaries coordinate with legacy direct DML using a table lock.
-- No shared trigger/policy is replaced. Legacy callers retain their v1 behaviour;
-- legacy aliases can still exist and must be explicitly selected by v2 clients.
create function cooksmith.save_pantry_item_v2(p_household_id uuid default null,p_item_id uuid default null,p_input jsonb default '{}')
returns setof cooksmith.household_pantry_items language plpgsql security invoker set search_path='' as $$
declare household uuid:=p_household_id; old_item cooksmith.household_pantry_items; identity text;
begin
 if p_item_id is not null then
  select * into old_item from cooksmith.household_pantry_items where id=p_item_id;
  if not found then raise exception 'Pantry item is unavailable.' using errcode='42501'; end if;
  if household is not null and household<>old_item.household_id then raise exception 'Household mismatch.' using errcode='42501'; end if;
  household:=old_item.household_id;
 end if;
 if auth.uid() is null or not cooksmith.is_active_household_member(household) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 lock table cooksmith.household_pantry_items in share row exclusive mode;
 if p_item_id is not null then select * into old_item from cooksmith.household_pantry_items where id=p_item_id for update; end if;
 identity:=cooksmith.canonical_ingredient_name_v2(p_input->>'name');
 if identity is null or identity='' then raise exception 'Check the Pantry item name.' using errcode='23514'; end if;
 if (p_item_id is null or identity is distinct from cooksmith.canonical_ingredient_name_v2(old_item.name))
 and exists(select 1 from cooksmith.household_pantry_items where household_id=household and id is distinct from p_item_id and cooksmith.canonical_ingredient_name_v2(name)=identity) then
  raise exception 'That Pantry identity already exists.' using errcode='23505'; end if;
 if p_item_id is null then
  return query insert into cooksmith.household_pantry_items(household_id,name,category,category_source,storage_location,storage_location_source,classification_version,quantity,unit,available,quantity_untracked)
  values(household,p_input->>'name',(p_input->>'category')::cooksmith.pantry_item_category,(p_input->>'categorySource')::cooksmith.pantry_classification_source,(p_input->>'storageLocation')::cooksmith.pantry_storage_location,(p_input->>'storageLocationSource')::cooksmith.pantry_classification_source,(p_input->>'classificationVersion')::integer,(p_input->>'quantity')::numeric,p_input->>'unit',(p_input->>'available')::boolean,coalesce((p_input->>'quantityUntracked')::boolean,false)) returning *;
 else
  return query update cooksmith.household_pantry_items set name=p_input->>'name',category=(p_input->>'category')::cooksmith.pantry_item_category,category_source=(p_input->>'categorySource')::cooksmith.pantry_classification_source,storage_location=(p_input->>'storageLocation')::cooksmith.pantry_storage_location,storage_location_source=(p_input->>'storageLocationSource')::cooksmith.pantry_classification_source,classification_version=(p_input->>'classificationVersion')::integer,quantity=(p_input->>'quantity')::numeric,unit=p_input->>'unit',available=(p_input->>'available')::boolean,quantity_untracked=coalesce((p_input->>'quantityUntracked')::boolean,old_item.quantity_untracked) where id=p_item_id and household_id=household returning *;
 end if;
end; $$;
revoke all on function cooksmith.save_pantry_item_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith.save_pantry_item_v2(uuid,uuid,jsonb) to authenticated;

create function cooksmith_private.check_put_away_identity_v2(household uuid,choices jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare choice jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(household) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(household::text||':shopping',0));
 lock table cooksmith.household_pantry_items in share row exclusive mode;
 for choice in select value from jsonb_array_elements(choices) loop
  if not exists(select 1 from cooksmith.household_pantry_items where household_id=household and normalised_name=lower(btrim(choice->>'name')))
   and exists(select 1 from cooksmith.household_pantry_items where household_id=household and cooksmith.canonical_ingredient_name_v2(name)=cooksmith.canonical_ingredient_name_v2(choice->>'name')) then
   raise exception 'Pantry changed. Choose the exact Pantry item.' using errcode='PT409'; end if;
 end loop;
end; $$;
revoke all on function cooksmith_private.check_put_away_identity_v2(uuid,jsonb) from public,anon;
grant execute on function cooksmith_private.check_put_away_identity_v2(uuid,jsonb) to authenticated;
create function cooksmith.receive_measured_shopping_v2(p_household_id uuid,p_operation_id uuid,p_choices jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from cooksmith.shopping_put_away_batches where id=p_operation_id and household_id=p_household_id) then
  perform cooksmith_private.check_put_away_identity_v2(p_household_id,p_choices); end if;
 return cooksmith.receive_measured_shopping(p_household_id,p_operation_id,p_choices);
end; $$;
create function cooksmith.put_shopping_away_v2(target_household_id uuid,operation_id uuid,reviewed_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from cooksmith.shopping_put_away_batches where id=operation_id and household_id=target_household_id) then
  perform cooksmith_private.check_put_away_identity_v2(target_household_id,reviewed_items); end if;
 return cooksmith.put_shopping_away(target_household_id,operation_id,reviewed_items);
end; $$;
revoke all on function cooksmith.receive_measured_shopping_v2(uuid,uuid,jsonb),cooksmith.put_shopping_away_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith.receive_measured_shopping_v2(uuid,uuid,jsonb),cooksmith.put_shopping_away_v2(uuid,uuid,jsonb) to authenticated;
do $$ begin if exists(select 1 from cs116_v1_contracts c left join pg_proc p on p.oid=c.oid where p.oid is null or c.definition is distinct from pg_get_functiondef(p.oid) or c.proacl is distinct from p.proacl) then raise exception 'CS-116 expansion changed an existing v1 function or ACL'; end if; end; $$;
commit;
