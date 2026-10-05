begin;
-- Material saves replace ingredient IDs. Preserve equivalent purchase overrides within
-- the same source recipe, while product/form or incompatible measure changes stay separate.
create or replace function cooksmith.shopping_sources_overlap(left_sources jsonb, right_sources jsonb)
returns boolean language sql immutable security invoker set search_path='' as $$
  select exists(select 1 from jsonb_array_elements(left_sources) l, jsonb_array_elements(right_sources) r
    where (l->>'sourceRecipeId' is null or r->>'sourceRecipeId' is null
      or (l->>'sourceRecipeId'=r->>'sourceRecipeId' and l->>'sourceRecipeKind'=r->>'sourceRecipeKind'))
    and (coalesce(l->>'purchaseName',cooksmith.canonical_ingredient_name_v1(l->>'name'))=coalesce(r->>'purchaseName',cooksmith.canonical_ingredient_name_v1(r->>'name'))
      or coalesce(r->'legacyPurchaseNames','[]'::jsonb) ? cooksmith.canonical_ingredient_name_v1(l->>'name')
      or coalesce(l->'legacyPurchaseNames','[]'::jsonb) ? cooksmith.canonical_ingredient_name_v1(r->>'name'))
    and (cooksmith.purchase_unit_v3(l->>'unit')=cooksmith.purchase_unit_v3(r->>'unit')
      or coalesce(l->>'purchaseUnit',cooksmith.purchase_unit_v3(l->>'unit'))=coalesce(r->>'purchaseUnit',cooksmith.purchase_unit_v3(r->>'unit'))));
$$;
commit;
