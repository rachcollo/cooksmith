begin;

alter table cooksmith.weekly_preparation_settings
  add column model_identifier text not null default 'configured server model';

alter table cooksmith.weekly_preparation_settings
  add constraint weekly_preparation_settings_model_identifier_safe
  check (
    char_length(btrim(model_identifier)) between 1 and 120
    and model_identifier !~* '(key|token|secret|bearer)'
  );

create table cooksmith.weekly_preparation_settings_audit (
  id bigint generated always as identity primary key,
  previous_ai_enabled boolean not null,
  ai_enabled boolean not null,
  previous_emergency_stop boolean not null,
  emergency_stop boolean not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  correlation_id uuid not null default gen_random_uuid(),
  constraint weekly_preparation_settings_audit_changed check (
    previous_ai_enabled is distinct from ai_enabled
    or previous_emergency_stop is distinct from emergency_stop
  )
);

create table cooksmith.weekly_preparation_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  corpus_version text not null,
  schema_version text not null,
  planner_version text not null,
  model_identifier text not null,
  pricing_version text not null,
  plan_count integer not null,
  deterministic_count integer not null,
  model_call_count integer not null,
  valid_output_count integer not null,
  accepted_count integer not null,
  rejected_count integer not null,
  fallback_count integer not null,
  unsupported_count integer not null,
  reviewed_correct_count integer not null,
  total_latency_ms bigint not null,
  input_tokens bigint not null,
  output_tokens bigint not null,
  estimated_cost_aud numeric(12, 6) not null,
  ambiguous_decision text not null,
  created_at timestamptz not null default now(),
  constraint weekly_preparation_evaluation_counts check (
    plan_count = 30
    and deterministic_count between 0 and plan_count
    and model_call_count between 0 and plan_count
    and valid_output_count between 0 and plan_count
    and accepted_count between 0 and plan_count
    and rejected_count between 0 and plan_count
    and fallback_count between 0 and plan_count
    and unsupported_count between 0 and plan_count
    and reviewed_correct_count between 0 and plan_count
    and total_latency_ms >= 0
    and input_tokens >= 0
    and output_tokens >= 0
    and estimated_cost_aud >= 0
  ),
  constraint weekly_preparation_evaluation_ambiguous_valid
    check (ambiguous_decision in ('accepted', 'rejected', 'fallback'))
);

create function cooksmith.audit_weekly_preparation_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ai_enabled and not new.emergency_stop and not exists (
    select 1
    from cooksmith.weekly_preparation_evaluation_runs evaluation
    where evaluation.plan_count = 30
      and evaluation.reviewed_correct_count = evaluation.plan_count
      and evaluation.unsupported_count = 0
    order by evaluation.created_at desc
    limit 1
  ) then
    raise exception 'Accepted 30-plan evaluation required' using errcode = '23514';
  end if;
  if not cooksmith.has_application_role('admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if old.ai_enabled is distinct from new.ai_enabled
    or old.emergency_stop is distinct from new.emergency_stop then
    insert into cooksmith.weekly_preparation_settings_audit (
      previous_ai_enabled,
      ai_enabled,
      previous_emergency_stop,
      emergency_stop,
      changed_by
    )
    values (
      old.ai_enabled,
      new.ai_enabled,
      old.emergency_stop,
      new.emergency_stop,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create trigger weekly_preparation_settings_audit_change
before update of ai_enabled, emergency_stop on cooksmith.weekly_preparation_settings
for each row execute function cooksmith.audit_weekly_preparation_settings();

alter table cooksmith.weekly_preparation_settings_audit enable row level security;
alter table cooksmith.weekly_preparation_evaluation_runs enable row level security;

grant select on cooksmith.weekly_preparation_settings to authenticated;
grant update (ai_enabled, emergency_stop) on cooksmith.weekly_preparation_settings to authenticated;
grant select on cooksmith.weekly_preparation_settings_audit to authenticated;
grant select on cooksmith.weekly_preparation_evaluation_runs to authenticated;

create policy weekly_preparation_settings_admin_select
on cooksmith.weekly_preparation_settings for select to authenticated
using ((select cooksmith.has_application_role('admin')));

create policy weekly_preparation_settings_admin_update
on cooksmith.weekly_preparation_settings for update to authenticated
using ((select cooksmith.has_application_role('admin')))
with check ((select cooksmith.has_application_role('admin')));

create policy weekly_preparation_settings_audit_admin_select
on cooksmith.weekly_preparation_settings_audit for select to authenticated
using ((select cooksmith.has_application_role('admin')));

create policy weekly_preparation_evaluation_admin_select
on cooksmith.weekly_preparation_evaluation_runs for select to authenticated
using ((select cooksmith.has_application_role('admin')));

revoke all on function cooksmith.audit_weekly_preparation_settings()
  from public, anon, authenticated;
grant all on cooksmith.weekly_preparation_settings_audit to service_role;
grant all on cooksmith.weekly_preparation_evaluation_runs to service_role;
grant usage, select on sequence cooksmith.weekly_preparation_settings_audit_id_seq to service_role;

comment on table cooksmith.weekly_preparation_settings_audit is
  'Append-only administrator audit evidence for safe weekly preparation controls.';
comment on table cooksmith.weekly_preparation_evaluation_runs is
  'Privacy-safe aggregate evidence for the versioned synthetic 30-plan release evaluation.';

commit;
