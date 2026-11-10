begin;

alter table cooksmith.household_settings
  drop constraint household_shopping_default_preset;
alter table cooksmith.household_settings
  add constraint household_shopping_default_preset
  check (shopping_default_period in ('nextWeek', 'week', 'next3', 'next5'));
alter table cooksmith.household_settings
  alter column shopping_default_period set default 'nextWeek';

-- Move the former full-week default forward without changing shorter presets
-- or any explicitly saved shared list selection.
update cooksmith.household_settings
set shopping_default_period = 'nextWeek'
where shopping_default_period = 'week';

alter table cooksmith.household_shopping_periods
  drop constraint household_shopping_period_kind;
alter table cooksmith.household_shopping_periods
  add constraint household_shopping_period_kind
  check (shopping_period_kind in ('default', 'nextWeek', 'week', 'next3', 'next5', 'custom'));

-- Keep household_shopping_period_dates unchanged: an explicit range belongs
-- to one Monday-based calendar week, which may be in the future.
comment on column cooksmith.household_settings.shopping_default_period is
  'Owner-managed usual Shopping preset. nextWeek is the next Monday-Sunday calendar week; week is the current week. Active members may separately override the shared list period. Existing settings RLS applies.';
comment on table cooksmith.household_shopping_periods is
  'Shared calendar-date Shopping cycle within its selected Monday-based week, including future weeks. Missing or expired choices follow the household default. Separate from owner-only household settings.';
comment on column cooksmith.household_shopping_periods.shopping_period_kind is
  'default follows the household preset; nextWeek, week, next3, next5 and custom are shared overrides anchored to shopping_period_week. Expired overrides fall back to the household default.';

commit;
