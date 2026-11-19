-- Real independent sessions, synthetic seeded households, local database only.
-- Run only after db:reset in a disposable local database. Remote fixtures
-- commit independently; reset again after ANY failure before rerunning.
-- Every waiter is observed in pg_locks; sleeps only poll state with a deadline.
begin;
create extension if not exists dblink with schema extensions;
select no_plan();
select extensions.dblink_connect('legacy','dbname=postgres user=postgres');
select extensions.dblink_connect('v2','dbname=postgres user=postgres');
select extensions.dblink_exec('legacy',$q$
 set role authenticated;
 set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
 set statement_timeout='5s';
 insert into cooksmith.household_pantry_items(id,household_id,name,category,storage_location,quantity,unit)
 values('b1160000-0000-4000-8000-000000000101','20000000-0000-4000-8000-000000000001','locking rice','other','pantry',200,'g');
$q$);
select extensions.dblink_exec('v2',$q$
 set role authenticated;
 set request.jwt.claim.sub='10000000-0000-4000-8000-000000000001';
 set statement_timeout='5s';
$q$);
create function pg_temp.wait_for_lock(connection text, mode text) returns boolean language plpgsql as $$
declare target_pid integer; deadline timestamptz:=clock_timestamp()+interval '3 seconds';
begin
 -- Connection PID is cached before its asynchronous query begins.
 select pid into target_pid from session_pids where name=connection;
 loop
  perform pg_stat_clear_snapshot();
  if exists(select 1 from pg_locks where pid=target_pid and relation='cooksmith.household_pantry_items'::regclass and pg_locks.mode=wait_for_lock.mode and not granted) then return true; end if;
  if clock_timestamp()>deadline then return false; end if;
  perform pg_sleep(0.01);
 end loop;
end; $$;
create temporary table session_pids(name text,pid integer);
insert into session_pids select 'legacy',pid from extensions.dblink('legacy','select pg_backend_pid()') as t(pid integer);
insert into session_pids select 'v2',pid from extensions.dblink('v2','select pg_backend_pid()') as t(pid integer);
-- Legacy owns a row first; queued EXCLUSIVE must not prevent its lock upgrade.
select extensions.dblink_exec('legacy','begin');
select * from extensions.dblink('legacy',$q$select id::text from cooksmith.household_pantry_items where id='b1160000-0000-4000-8000-000000000101' for update$q$) as t(id text);
select extensions.dblink_send_query('v2',$q$select count(*)::integer from cooksmith.save_pantry_item_v2('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000101','{"name":"locking rice","category":"other","categorySource":"explicit","storageLocation":"pantry","storageLocationSource":"explicit","classificationVersion":1,"quantity":300,"unit":"g","available":true}')$q$);
select ok(pg_temp.wait_for_lock('v2','ExclusiveLock'),'v2 waits on legacy RowShare before acquiring a pantry row');
select lives_ok($q$select extensions.dblink_exec('legacy', 'update cooksmith.household_pantry_items set quantity=quantity+1 where id=''b1160000-0000-4000-8000-000000000101''; commit')$q$,'legacy direct writer upgrades and commits while v2 waits');
select is((select n from extensions.dblink_get_result('v2') as t(n integer)),1,'queued v2 save completes');
select * from extensions.dblink_get_result('v2') as t(n integer);
-- Execute real v1 RPCs after a legacy row lock, with v2 already queued. The
-- preparatory row lock makes the critical interleaving deterministic; the RPCs
-- still execute their real authorisation, validation, row locks and UPDATEs.
create temporary table legacy_cases(name text,setup text,command text);
insert into legacy_cases values
('old put-away',
$q$insert into cooksmith.shopping_list_items(id,household_id,display_name,category,manual,completed) values('b1160000-0000-4000-8000-000000000102','20000000-0000-4000-8000-000000000001','locking rice','other',true,true)$q$,
$q$select cooksmith.put_shopping_away('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000103',jsonb_build_array(jsonb_build_object('name','locking rice','sources',jsonb_build_array(jsonb_build_object('key',source_key,'token',snapshot_token)))))::text from cooksmith.shopping_put_away_sources('20000000-0000-4000-8000-000000000001') where shopping_item_id='b1160000-0000-4000-8000-000000000102'$q$),
('measured receiving',
$q$insert into cooksmith.shopping_list_items(id,household_id,display_name,category,quantity,unit) values('b1160000-0000-4000-8000-000000000104','20000000-0000-4000-8000-000000000001','locking rice','other',10,'g');
do $do$ begin perform cooksmith.record_shopping_stock_purchase('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000105','locking rice',(select jsonb_agg(jsonb_build_object('id',id,'updatedAt',updated_at)) from cooksmith.shopping_list_items where id='b1160000-0000-4000-8000-000000000104'),'[{"quantity":10,"unit":"g"}]'); end; $do$$q$,
$q$select cooksmith.receive_measured_shopping('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000106',jsonb_build_array(jsonb_build_object('name','locking rice','quantity',10,'unit','g','pantryUpdatedAt',stock.updated_at,'sources',jsonb_build_array(jsonb_build_object('key','p:'||source.id::text,'token',source.snapshot_token)))))::text from cooksmith.measured_shopping_sources('20000000-0000-4000-8000-000000000001') source cross join cooksmith.household_pantry_items stock where source.id='b1160000-0000-4000-8000-000000000105' and stock.id='b1160000-0000-4000-8000-000000000101'$q$),
('meal stock command',
$q$insert into cooksmith.planned_meals(id,household_id,meal_date,meal_type,title) values('b1160000-0000-4000-8000-000000000107','20000000-0000-4000-8000-000000000001','2026-11-19','dinner','Lock regression')$q$,
$q$select cooksmith.meal_stock_command('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000108',meal.id,'done',meal.completion_revision,meal.updated_at,jsonb_build_array(jsonb_build_object('kind','pantry','pantryItemId',stock.id,'name',stock.name,'unit','g','amount',10,'updatedAt',stock.updated_at)))::text from cooksmith.planned_meals meal cross join cooksmith.household_pantry_items stock where meal.id='b1160000-0000-4000-8000-000000000107' and stock.id='b1160000-0000-4000-8000-000000000101'$q$);
insert into legacy_cases
select name||' v2',setup,
 replace(replace(command,'cooksmith.put_shopping_away(','cooksmith.put_shopping_away_v2('),'cooksmith.receive_measured_shopping(','cooksmith.receive_measured_shopping_v2(')
from legacy_cases where name in ('old put-away','measured receiving');
create function pg_temp.exercise_legacy() returns setof text language plpgsql as $$
declare scenario record; result text; saved integer;
begin
 for scenario in select * from legacy_cases loop
  perform extensions.dblink_exec('legacy','begin');
  perform extensions.dblink_exec('legacy',scenario.setup);
  perform * from extensions.dblink('legacy',$q$select id::text from cooksmith.household_pantry_items where id='b1160000-0000-4000-8000-000000000101' for update$q$) as t(id text);
  perform extensions.dblink_send_query('v2',$q$select count(*)::integer from cooksmith.save_pantry_item_v2('20000000-0000-4000-8000-000000000001','b1160000-0000-4000-8000-000000000101','{"name":"locking rice","category":"other","categorySource":"explicit","storageLocation":"pantry","storageLocationSource":"explicit","classificationVersion":1,"quantity":300,"unit":"g","available":true}')$q$);
  return next ok(pg_temp.wait_for_lock('v2','ExclusiveLock'),scenario.name||': v2 is queued before legacy UPDATE');
  select t.value into result from extensions.dblink('legacy',scenario.command) as t(value text);
  return next ok(result is not null,scenario.name||': actual v1 RPC completes without deadlock');
  perform extensions.dblink_exec('legacy','rollback');
  select n into saved from extensions.dblink_get_result('v2') as t(n integer);
  return next is(saved,1,scenario.name||': v2 completes after legacy transaction ends');
  perform * from extensions.dblink_get_result('v2') as t(n integer);
 end loop;
end; $$;
select * from pg_temp.exercise_legacy();

-- Reverse ordering: no legacy row lock may pass an already-held v2 boundary.
select extensions.dblink_exec('v2','begin');
select * from extensions.dblink('v2',$q$select cooksmith_private.check_put_away_identity_v2('20000000-0000-4000-8000-000000000001','[{"name":"locking rice","sources":[{"key":"m:synthetic"}]}]')::text$q$) as t(result text);
select extensions.dblink_send_query('legacy',$q$select id::text from cooksmith.household_pantry_items where id='b1160000-0000-4000-8000-000000000101' for update$q$);
select ok(pg_temp.wait_for_lock('legacy','RowShareLock'),'legacy FOR UPDATE waits before owning a row behind v2');
select extensions.dblink_exec('v2','rollback');
select is((select id from extensions.dblink_get_result('legacy') as t(id text)),'b1160000-0000-4000-8000-000000000101','legacy row read completes after v2 releases');
select * from extensions.dblink_get_result('legacy') as t(id text);
-- Hold both locks in another session. Invalid choices must fail before either.
select extensions.dblink_exec('legacy',$q$begin; lock table cooksmith.household_pantry_items in exclusive mode;$q$);
select * from extensions.dblink('legacy',$q$select pg_advisory_xact_lock(hashtextextended('20000000-0000-4000-8000-000000000001:shopping',0))::text$q$) as t(result text);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local lock_timeout='200ms';
select throws_ok(format('select cooksmith_private.check_put_away_identity_v2(%L,%L::jsonb)','20000000-0000-4000-8000-000000000001',payload),'23514',null,'invalid input rejects before lock: '||coalesce(payload,'SQL NULL'))
from (values(null::text),('null'),('{}'),('1'),('"bad"'),('[]'),('[null]'),('[{}]'),('[{"name":"rice","sources":{}}]'),('[{"name":"rice","sources":[]}]'),('[{"name":" ","sources":[{"key":"x"}]}]'),('[{"name":"rice","sources":[null]}]'),('[{"name":"rice","sources":[{}]}]'),((select jsonb_agg('{}'::jsonb)::text from generate_series(1,101)))) inputs(payload);
select throws_ok($q$select cooksmith.receive_measured_shopping_v2('20000000-0000-4000-8000-000000000001',null,'[{"name":"rice","sources":[{"key":"p:synthetic"}]}]')$q$,'23514',null,'null measured operation rejects before identity lock');
select throws_ok($q$select cooksmith.put_shopping_away_v2('20000000-0000-4000-8000-000000000001',null,'[{"name":"rice","sources":[{"key":"m:synthetic"}]}]')$q$,'23514',null,'null legacy operation rejects before identity lock');
-- Different household: valid requests still contend on the documented global lock.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
select throws_ok($q$select cooksmith_private.check_put_away_identity_v2('20000000-0000-4000-8000-000000000002','[{"name":"rice","sources":[{"key":"m:synthetic"}]}]')$q$,'55P03',null,'cross-household contention respects lock_timeout');
reset role;
select extensions.dblink_exec('legacy','rollback');
select extensions.dblink_exec('legacy',$q$delete from cooksmith.household_pantry_items where id='b1160000-0000-4000-8000-000000000101'$q$);
select extensions.dblink_disconnect('legacy');
select extensions.dblink_disconnect('v2');
select * from finish();
rollback;
