begin;
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

-- This helper runs only after the caller's household lock and authorisation.
-- Equal source multisets and totals prove that this is identity-only, not a
-- recipe/quantity repair. Never delete/reinsert source rows to change a label.
create function cooksmith_private.refresh_purchase_identity_v2(target_household_id uuid,target_planned_meal_id uuid,ingredient_inputs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare old_sources jsonb; new_sources jsonb; old_totals jsonb; new_totals jsonb;
begin
 if auth.uid() is null or not cooksmith.is_active_household_member(target_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(target_household_id::text || ':shopping',0));
 select jsonb_agg(s.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] order by (s.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'])::text)
 into old_sources from cooksmith.shopping_item_contributions c cross join lateral jsonb_array_elements(c.source_quantities) s
 where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id;
 select jsonb_agg(s.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] order by (s.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'])::text)
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
    where incoming.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] = s.value - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] limit 1) order by s.ordinality)
  from jsonb_array_elements(c.source_quantities) with ordinality s
 ) where c.household_id=target_household_id and c.planned_meal_id=target_planned_meal_id;
 return true;
end; $$;
revoke all on function cooksmith_private.refresh_purchase_identity_v2(uuid,uuid,jsonb) from public,anon;
grant execute on function cooksmith_private.refresh_purchase_identity_v2(uuid,uuid,jsonb) to authenticated;

-- Keep the mature reconciliation contract, unit conversions and source/override
-- guards. Resolve v2 aliases against existing rows before inserting a new row.
do $upgrade$
declare definition text; needle text; replacement text;
begin
 definition := pg_get_functiondef('cooksmith.reconcile_planned_meal_shopping(uuid,uuid,jsonb)'::regprocedure);
 definition := replace(definition,'cooksmith.canonical_ingredient_name_v1(', 'cooksmith.canonical_ingredient_name_v2(');
 needle := '  select coalesce(jsonb_agg(to_jsonb(purchase)), ''[]''::jsonb) into previous_groups';
 if position(needle in definition)=0 then raise exception 'Missing reconciliation snapshot guard'; end if;
 definition := replace(definition,needle, '  if cooksmith_private.refresh_purchase_identity_v2(target_household_id,target_planned_meal_id,ingredient_inputs) then return; end if;' || chr(10) || needle);
 needle := $old$    if not overridden then
    insert into cooksmith.shopping_list_items$old$;
 replacement := $new$    if not overridden then
    select i.id into current_item_id from cooksmith.shopping_list_items i
      where i.household_id=target_household_id and not i.manual
      and cooksmith.canonical_ingredient_name_v2(i.display_name)=ingredient.name and i.unit_identity=ingredient.unit
      order by exists(select 1 from cooksmith.shopping_item_contributions c where c.shopping_item_id=i.id and c.planned_meal_id=target_planned_meal_id) desc,i.created_at,i.id limit 1;
    end if;
    if current_item_id is null then
    insert into cooksmith.shopping_list_items$new$;
 if position(needle in definition)=0 then raise exception 'Missing reconciliation insert guard'; end if;
 definition := replace(definition,needle,replacement);
 execute definition;
end;
$upgrade$;
-- Identity-only refresh retains individual bought states, including a mixed
-- bought/unbought legacy alias group. Do not apply overlap restoration to rows
-- whose source evidence survived in place (or touch their timestamps on retry).
do $refresh$
declare definition text; needle text;
begin
 definition := pg_get_functiondef('cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)'::regprocedure);
 needle := '    update cooksmith.shopping_list_items set completed=(';
 if position(needle in definition)=0 then raise exception 'Missing refresh completion restoration'; end if;
 definition := replace(definition,
  '    perform cooksmith.reconcile_planned_meal_shopping(target_household_id,(batch->>''mealId'')::uuid,batch->''inputs'');',
  $protected$    if not cooksmith_private.refresh_purchase_identity_v2(target_household_id,(batch->>'mealId')::uuid,batch->'inputs') then
      if exists(select 1 from cooksmith.shopping_item_contributions c
        where c.household_id=target_household_id and c.planned_meal_id=(batch->>'mealId')::uuid
        and (exists(select 1 from cooksmith.shopping_stock_purchases p where p.household_id=target_household_id
          and (c.shopping_item_id=any(p.item_ids) or ('c:'||c.id::text)=any(p.source_keys)))
          or exists(select 1 from cooksmith.shopping_put_away_receipts r where r.household_id=target_household_id
            and (r.shopping_item_id=c.shopping_item_id or r.source_key='c:'||c.id::text)))) then
        raise exception 'Purchased source evidence requires a separate repair.' using errcode='PT409';
      end if;
      perform cooksmith.reconcile_planned_meal_shopping(target_household_id,(batch->>'mealId')::uuid,batch->'inputs');
    end if;$protected$);
 definition := replace(definition,needle,$guard$    if exists(select 1 from jsonb_array_elements(previous_items) old
      where old->>'id'=current_item.id::text
      and (select jsonb_agg(s - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] order by (s - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'])::text) from jsonb_array_elements(old->'sources') s)
       = (select jsonb_agg(s - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'] order by (s - array['purchaseName','legacyPurchaseNames','ingredientIdentityVersion'])::text) from jsonb_array_elements(current_item.sources) s)) then continue; end if;
$guard$ || needle);
 execute definition;
end;
$refresh$;

-- Source overlap must bridge identity versions for the outer refresh's bought-state
-- restoration, including pre-structure sources without sourceIngredientId.
create or replace function cooksmith.shopping_sources_overlap(left_sources jsonb,right_sources jsonb)
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
-- Pantry keeps existing rows. New aliases are rejected, never auto-combined.
do $pantry$
declare definition text;
begin
 definition := pg_get_functiondef('cooksmith_private.check_pantry_ingredient_identity_v1()'::regprocedure);
 execute replace(definition,'cooksmith.canonical_ingredient_name_v1(', 'cooksmith.canonical_ingredient_name_v2(');
end;
$pantry$;
create index pantry_identity_v2_lookup on cooksmith.household_pantry_items(household_id,cooksmith.canonical_ingredient_name_v2(name));
commit;
