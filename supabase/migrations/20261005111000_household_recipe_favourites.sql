begin;
create table cooksmith.household_recipe_favourites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  household_recipe_id uuid references cooksmith.household_recipes(id) on delete cascade,
  imported_recipe_id uuid references cooksmith.imported_recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourite_one_source check (num_nonnulls(household_recipe_id, imported_recipe_id)=1)
);
create unique index household_favourite_recipe_unique on cooksmith.household_recipe_favourites(household_id, household_recipe_id) where household_recipe_id is not null;
create unique index household_favourite_import_unique on cooksmith.household_recipe_favourites(household_id, imported_recipe_id) where imported_recipe_id is not null;
create index favourite_household_recipe_fk on cooksmith.household_recipe_favourites(household_recipe_id);
create index favourite_imported_recipe_fk on cooksmith.household_recipe_favourites(imported_recipe_id);
alter table cooksmith.household_recipe_favourites enable row level security;
grant select, insert, delete on cooksmith.household_recipe_favourites to authenticated;
create policy favourite_visible on cooksmith.household_recipe_favourites for select to authenticated using (
  cooksmith.is_active_household_member(household_id) and (
    exists(select 1 from cooksmith.household_recipes r where r.id=household_recipe_id and r.household_id=household_recipe_favourites.household_id and r.archived_at is null)
    or exists(select 1 from cooksmith.imported_recipes r where r.id=imported_recipe_id and r.visibility='public' and r.archived_at is null)
  )
);
create policy favourite_add on cooksmith.household_recipe_favourites for insert to authenticated with check (
  cooksmith.is_active_household_member(household_id) and (
    exists(select 1 from cooksmith.household_recipes r where r.id=household_recipe_id and r.household_id=household_recipe_favourites.household_id and r.archived_at is null)
    or exists(select 1 from cooksmith.imported_recipes r where r.id=imported_recipe_id and r.visibility='public' and r.archived_at is null)
  )
);
create policy favourite_remove on cooksmith.household_recipe_favourites for delete to authenticated using (cooksmith.is_active_household_member(household_id));

-- Preserve only favourites with an existing, unambiguous household owner.
-- A shared recipe's legacy global flag cannot establish any household's preference.
insert into cooksmith.household_recipe_favourites(household_id, household_recipe_id)
select household_id,id from cooksmith.household_recipes where favourite and archived_at is null;

create function cooksmith.set_household_recipe_favourite(target_household_id uuid, target_recipe_id uuid, target_source text, desired boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  if not cooksmith.is_active_household_member(target_household_id) then raise exception 'Active household membership is required.' using errcode='42501'; end if;
  if desired is null or target_recipe_id is null or target_source is null or target_source not in ('household','imported') then raise exception 'Invalid favourite.' using errcode='23514'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_household_id::text||target_source||target_recipe_id::text,0));
  if target_source='household' then
    perform 1 from cooksmith.household_recipes where id=target_recipe_id and household_id=target_household_id and archived_at is null;
  else
    perform 1 from cooksmith.imported_recipes where id=target_recipe_id and visibility='public' and archived_at is null;
  end if;
  if not found then raise exception 'Recipe is not available.' using errcode='42501'; end if;
  if desired then
    insert into cooksmith.household_recipe_favourites(household_id,household_recipe_id,imported_recipe_id)
    values(target_household_id,case when target_source='household' then target_recipe_id end,case when target_source='imported' then target_recipe_id end)
    on conflict do nothing;
  else
    delete from cooksmith.household_recipe_favourites where household_id=target_household_id and case when target_source='household' then household_recipe_id=target_recipe_id else imported_recipe_id=target_recipe_id end;
  end if;
  return desired;
end;
$$;
revoke all on function cooksmith.set_household_recipe_favourite(uuid,uuid,text,boolean) from public,anon;
grant execute on function cooksmith.set_household_recipe_favourite(uuid,uuid,text,boolean) to authenticated;
commit;
