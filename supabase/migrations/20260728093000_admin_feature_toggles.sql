begin;

create table cooksmith.feature_flags (
  key text primary key,
  name text not null,
  description text not null,
  enabled boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feature_flags_key_format check (key ~ '^[a-z][a-z0-9_]{2,63}$'),
  constraint feature_flags_name_length check (char_length(btrim(name)) between 1 and 100),
  constraint feature_flags_description_length check (
    char_length(btrim(description)) between 1 and 500
  )
);

create table cooksmith.feature_flag_audit (
  id bigint generated always as identity primary key,
  flag_key text not null references cooksmith.feature_flags (key) on delete restrict,
  previous_enabled boolean not null,
  enabled boolean not null,
  changed_by uuid not null references auth.users (id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint feature_flag_audit_changed_state check (previous_enabled <> enabled)
);

create index feature_flag_audit_flag_changed_idx
  on cooksmith.feature_flag_audit (flag_key, changed_at desc);

create trigger feature_flags_set_updated_at
before update on cooksmith.feature_flags
for each row execute function cooksmith.set_updated_at();

create function cooksmith.audit_feature_flag_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.enabled is distinct from new.enabled then
    if not cooksmith.has_application_role('admin') then
      raise exception 'Administrator access required' using errcode = '42501';
    end if;
    new.updated_by := (select auth.uid());
    insert into cooksmith.feature_flag_audit (
      flag_key,
      previous_enabled,
      enabled,
      changed_by
    )
    values (new.key, old.enabled, new.enabled, (select auth.uid()));
  end if;
  return new;
end;
$$;

create trigger feature_flags_audit_change
before update of enabled on cooksmith.feature_flags
for each row execute function cooksmith.audit_feature_flag_change();

insert into cooksmith.feature_flags (key, name, description, enabled)
values (
  'planner_apply_confirmation',
  'Planner confirmation screen',
  'Show a confirmation after a weekly plan is applied successfully.',
  false
);

alter table cooksmith.feature_flags enable row level security;
alter table cooksmith.feature_flag_audit enable row level security;

grant select on cooksmith.feature_flags to authenticated;
grant update (enabled) on cooksmith.feature_flags to authenticated;
grant select on cooksmith.feature_flag_audit to authenticated;

create policy feature_flags_select_authenticated
on cooksmith.feature_flags
for select
to authenticated
using (true);

create policy feature_flags_update_admin
on cooksmith.feature_flags
for update
to authenticated
using ((select cooksmith.has_application_role('admin')))
with check ((select cooksmith.has_application_role('admin')));

create policy feature_flag_audit_select_admin
on cooksmith.feature_flag_audit
for select
to authenticated
using ((select cooksmith.has_application_role('admin')));

revoke all on function cooksmith.audit_feature_flag_change() from public, anon, authenticated;

comment on table cooksmith.feature_flags is
  'Typed global product controls readable by signed-in users and writable only by application admins.';
comment on table cooksmith.feature_flag_audit is
  'Append-only evidence for administrator feature flag changes.';
comment on function cooksmith.audit_feature_flag_change() is
  'Restricted trigger function that attributes administrator flag changes without exposing audit inserts.';

commit;
