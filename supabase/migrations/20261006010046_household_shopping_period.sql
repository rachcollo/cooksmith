begin;
create table cooksmith.household_shopping_periods (
  household_id uuid primary key references cooksmith.households(id) on delete cascade,
  shopping_period_kind text not null default 'week',
  shopping_period_week date not null,
  shopping_period_from date not null,
  shopping_period_to date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_shopping_period_kind check (shopping_period_kind in ('week','next3','next5','custom')),
  constraint household_shopping_period_dates check (
    extract(isodow from shopping_period_week)=1
    and shopping_period_from>=shopping_period_week
    and shopping_period_to<=shopping_period_week+6
    and shopping_period_from<=shopping_period_to
  )
);
alter table cooksmith.household_shopping_periods enable row level security;
grant select, insert, update on cooksmith.household_shopping_periods to authenticated;
create policy shopping_period_select_member on cooksmith.household_shopping_periods for select to authenticated using ((select cooksmith.is_active_household_member(household_id)));
create policy shopping_period_insert_member on cooksmith.household_shopping_periods for insert to authenticated with check ((select cooksmith.is_active_household_member(household_id)));
create policy shopping_period_update_member on cooksmith.household_shopping_periods for update to authenticated using ((select cooksmith.is_active_household_member(household_id))) with check ((select cooksmith.is_active_household_member(household_id)));
create trigger shopping_period_updated_at before update on cooksmith.household_shopping_periods for each row execute function cooksmith.set_updated_at();
comment on table cooksmith.household_shopping_periods is 'Shared calendar-date Shopping cycle. Missing or stale choices fall back visibly to the active Monday-based planning week. Separate from owner-only household settings.';
commit;
