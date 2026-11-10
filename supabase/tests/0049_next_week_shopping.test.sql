begin;
select plan(29);

-- Rehearse the actual forward migration with pre-release settings. Supabase
-- records the executed SQL during local reset. Skip only its transaction
-- wrappers so every fixture and schema change remains inside this rollback.
update cooksmith.household_settings set shopping_default_period = 'week'
where household_id = '20000000-0000-4000-8000-000000000001';
update cooksmith.household_settings set shopping_default_period = 'next3'
where household_id = '20000000-0000-4000-8000-000000000002';
insert into cooksmith.households (id, name)
values ('20000000-0000-4000-8000-000000000049', 'Shopping migration fixture');
insert into cooksmith.household_settings (household_id, shopping_default_period)
values ('20000000-0000-4000-8000-000000000049', 'next5');
insert into cooksmith.household_shopping_periods
  (household_id, shopping_period_kind, shopping_period_week, shopping_period_from, shopping_period_to)
values
  ('20000000-0000-4000-8000-000000000001', 'week', '2026-11-02', '2026-11-02', '2026-11-08'),
  ('20000000-0000-4000-8000-000000000002', 'custom', '2026-11-09', '2026-11-10', '2026-11-12');
create temporary table saved_shopping_choices as
select * from cooksmith.household_shopping_periods;

-- Restore both original constraints and the original default before replay.
alter table cooksmith.household_settings drop constraint household_shopping_default_preset;
alter table cooksmith.household_settings add constraint household_shopping_default_preset
  check (shopping_default_period in ('week', 'next3', 'next5'));
alter table cooksmith.household_settings alter column shopping_default_period set default 'week';
alter table cooksmith.household_shopping_periods drop constraint household_shopping_period_kind;
alter table cooksmith.household_shopping_periods add constraint household_shopping_period_kind
  check (shopping_period_kind in ('default', 'week', 'next3', 'next5', 'custom'));

select lives_ok($replay$
do $body$
declare
  migration_statements text[];
  migration_statement text;
begin
  select statements into strict migration_statements
  from supabase_migrations.schema_migrations
  where version = '20261107223923';
  if coalesce(cardinality(migration_statements), 0) = 0 then
    raise exception 'Local reset must record the migration SQL for this regression';
  end if;
  foreach migration_statement in array migration_statements loop
    if migration_statement !~* '^\s*(begin|commit)\s*;?\s*$' then
      execute migration_statement;
    end if;
  end loop;
end;
$body$;
$replay$, 'Forward migration applies to existing household settings');
select is((select shopping_default_period from cooksmith.household_settings where household_id = '20000000-0000-4000-8000-000000000001'), 'nextWeek', 'Former week default migrates to next week');
select is((select shopping_default_period from cooksmith.household_settings where household_id = '20000000-0000-4000-8000-000000000002'), 'next3', 'Existing next-three-planned-meals default is preserved');
select is((select shopping_default_period from cooksmith.household_settings where household_id = '20000000-0000-4000-8000-000000000049'), 'next5', 'Existing next-five-planned-meals default is preserved');
select results_eq(
  $$select * from cooksmith.household_shopping_periods order by household_id$$,
  $$select * from saved_shopping_choices order by household_id$$,
  'Migration preserves explicit week and future custom selections, including timestamps');
insert into cooksmith.households (id, name)
values ('20000000-0000-4000-8000-000000000050', 'New shopping household fixture');
insert into cooksmith.household_settings (household_id)
values ('20000000-0000-4000-8000-000000000050');
select is((select shopping_default_period from cooksmith.household_settings where household_id = '20000000-0000-4000-8000-000000000050'), 'nextWeek', 'New household settings default to next week');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select results_eq($$update cooksmith.household_settings set shopping_default_period = 'week' returning household_id$$, array['20000000-0000-4000-8000-000000000001'::uuid], 'Owner may still choose this week');
select results_eq($$update cooksmith.household_settings set shopping_default_period = 'nextWeek' returning household_id$$, array['20000000-0000-4000-8000-000000000001'::uuid], 'Owner may choose next week');
select throws_ok($$update cooksmith.household_settings set shopping_default_period = 'invalid'$$, '23514', null, 'Unknown default preset rejected');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select results_eq($$update cooksmith.household_shopping_periods set shopping_period_kind = 'nextWeek', shopping_period_week = '2026-11-09', shopping_period_from = '2026-11-09', shopping_period_to = '2026-11-15' returning household_id$$, array['20000000-0000-4000-8000-000000000001'::uuid], 'Active member saves next Monday through Sunday');
select is((select shopping_period_kind from cooksmith.household_shopping_periods), 'nextWeek', 'Next-week choice persists');
select results_eq($$update cooksmith.household_shopping_periods set shopping_period_kind = 'custom' returning household_id$$, array['20000000-0000-4000-8000-000000000001'::uuid], 'Active member saves the same future calendar dates as custom');
select is((select shopping_period_to from cooksmith.household_shopping_periods), '2026-11-15'::date, 'Future custom range includes Sunday');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_from = 'not-a-date'$$, '22007', null, 'Malformed calendar date rejected');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_from = '2026-11-16'$$, '23514', null, 'Reversed calendar range rejected');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_to = '2026-11-16'$$, '23514', null, 'Range cannot cross into the following Monday');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_from = '2026-11-08'$$, '23514', null, 'Range cannot precede its selected Monday');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_week = '2026-11-10'$$, '23514', null, 'Week anchor must be Monday');
select throws_ok($$update cooksmith.household_shopping_periods set shopping_period_kind = 'invalid'$$, '23514', null, 'Unknown shared selection rejected');
with changed as (update cooksmith.household_settings set shopping_default_period = 'week' returning household_id)
select is((select count(*) from changed), 0::bigint, 'Active member cannot change the owner-managed default');
select is((select shopping_default_period from cooksmith.household_settings), 'nextWeek', 'Shared choice leaves usual default unchanged');
select throws_ok($$update cooksmith.household_shopping_periods set household_id = '20000000-0000-4000-8000-000000000049'$$, '42501', null, 'Member cannot move a future selection to another household');

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*) from cooksmith.household_shopping_periods where household_id = '20000000-0000-4000-8000-000000000001'), 0::bigint, 'Unrelated member cannot read future selection');
with changed as (update cooksmith.household_shopping_periods set shopping_period_kind = 'nextWeek' where household_id = '20000000-0000-4000-8000-000000000001' returning household_id)
select is((select count(*) from changed), 0::bigint, 'Unrelated member cannot overwrite future selection');
select throws_ok($$insert into cooksmith.household_shopping_periods (household_id, shopping_period_kind, shopping_period_week, shopping_period_from, shopping_period_to) values ('20000000-0000-4000-8000-000000000049', 'nextWeek', '2026-11-09', '2026-11-09', '2026-11-15')$$, '42501', null, 'Forged future-week insert denied');
reset role;
update cooksmith.household_members set status = 'inactive', inactive_at = now() where user_id = '10000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*) from cooksmith.household_shopping_periods), 0::bigint, 'Inactive member cannot read future selection');
with changed as (update cooksmith.household_shopping_periods set shopping_period_kind = 'nextWeek' returning household_id)
select is((select count(*) from changed), 0::bigint, 'Inactive member cannot update future selection');
reset role;
select ok(not has_table_privilege('anon', 'cooksmith.household_shopping_periods', 'select'), 'Anonymous selection reads remain denied');
select ok(not has_table_privilege('anon', 'cooksmith.household_shopping_periods', 'insert'), 'Anonymous selection writes remain denied');
select * from finish();
rollback;
