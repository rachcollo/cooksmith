begin;
alter table cooksmith.household_settings add column shopping_default_period text not null default 'week' constraint household_shopping_default_preset check (shopping_default_period in ('week','next3','next5'));
comment on column cooksmith.household_settings.shopping_default_period is 'Owner-managed usual Shopping preset. Active members may separately override the shared current-week list period. Existing settings RLS applies.';
alter table cooksmith.household_shopping_periods drop constraint household_shopping_period_kind;
alter table cooksmith.household_shopping_periods add constraint household_shopping_period_kind check (shopping_period_kind in ('default','week','next3','next5','custom'));
comment on column cooksmith.household_shopping_periods.shopping_period_kind is 'default follows the household preset; other kinds are shared overrides for shopping_period_week. Expired overrides fall back to the household default.';
commit;
