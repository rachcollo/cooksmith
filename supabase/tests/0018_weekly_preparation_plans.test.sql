begin;
select plan(8);

select has_table('cooksmith', 'weekly_preparation_plans');
select has_table('cooksmith', 'weekly_preparation_settings');
select row_security_active('cooksmith.weekly_preparation_plans');
select row_security_active('cooksmith.weekly_preparation_settings');
select has_index('cooksmith', 'weekly_preparation_plans', 'weekly_preparation_plans_cache_unique');
select has_check('cooksmith', 'weekly_preparation_plans', 'weekly_preparation_plans_generation_valid');
select has_check('cooksmith', 'weekly_preparation_plans', 'weekly_preparation_plans_result_object');
select isnt_empty(
  $$select 1 from pg_policies
    where schemaname = 'cooksmith'
      and tablename = 'weekly_preparation_plans'
      and policyname = 'weekly_preparation_plans_select_household'$$,
  'weekly plan reads have a household membership policy'
);

select * from finish();
rollback;
