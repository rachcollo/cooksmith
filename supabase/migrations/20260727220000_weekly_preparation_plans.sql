begin;

create table cooksmith.weekly_preparation_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references cooksmith.households(id) on delete cascade,
  plan_key text not null,
  cache_key text not null,
  schema_version text not null,
  planner_version text not null,
  generation text not null,
  result jsonb not null,
  fallback_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_preparation_plans_cache_unique unique (household_id, plan_key, cache_key),
  constraint weekly_preparation_plans_generation_valid
    check (generation in ('deterministic', 'model-assisted', 'fallback')),
  constraint weekly_preparation_plans_result_object check (jsonb_typeof(result) = 'object'),
  constraint weekly_preparation_plans_versions_required check (
    char_length(btrim(plan_key)) between 1 and 160
    and char_length(btrim(cache_key)) between 1 and 160
    and char_length(btrim(schema_version)) between 1 and 80
    and char_length(btrim(planner_version)) between 1 and 80
  )
);

create table cooksmith.weekly_preparation_settings (
  singleton boolean primary key default true,
  ai_enabled boolean not null default false,
  emergency_stop boolean not null default false,
  daily_plan_limit integer not null default 50,
  monthly_cost_limit_aud numeric(10, 2) not null default 10,
  updated_at timestamptz not null default now(),
  constraint weekly_preparation_settings_singleton check (singleton),
  constraint weekly_preparation_settings_limits check (
    daily_plan_limit between 0 and 10000
    and monthly_cost_limit_aud between 0 and 10000
  )
);

insert into cooksmith.weekly_preparation_settings (singleton) values (true);

create index weekly_preparation_plans_current_idx
  on cooksmith.weekly_preparation_plans (household_id, plan_key, updated_at desc);

create trigger weekly_preparation_plans_set_updated_at
before update on cooksmith.weekly_preparation_plans
for each row execute function cooksmith.set_updated_at();

create trigger weekly_preparation_settings_set_updated_at
before update on cooksmith.weekly_preparation_settings
for each row execute function cooksmith.set_updated_at();

alter table cooksmith.weekly_preparation_plans enable row level security;
alter table cooksmith.weekly_preparation_settings enable row level security;

create policy weekly_preparation_plans_select_household
on cooksmith.weekly_preparation_plans
for select
to authenticated
using ((select cooksmith.is_active_household_member(household_id)));

revoke all on cooksmith.weekly_preparation_plans from public, anon;
grant select on cooksmith.weekly_preparation_plans to authenticated;
revoke all on cooksmith.weekly_preparation_settings from public, anon, authenticated;
grant all on cooksmith.weekly_preparation_plans to service_role;
grant all on cooksmith.weekly_preparation_settings to service_role;

commit;
