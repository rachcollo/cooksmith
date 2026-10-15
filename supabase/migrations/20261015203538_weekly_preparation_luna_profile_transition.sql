begin;

-- Immutable profile history; browser roles can only read it as application admins.
create table cooksmith.weekly_preparation_profile_audit (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid not null references auth.users(id) on delete restrict,
  changed_at timestamptz not null default now(),
  previous_profile jsonb not null,
  profile jsonb not null
);
create index weekly_preparation_profile_audit_changed_by_idx on cooksmith.weekly_preparation_profile_audit(changed_by);
alter table cooksmith.weekly_preparation_profile_audit enable row level security;
create policy weekly_preparation_profile_audit_admin_select
  on cooksmith.weekly_preparation_profile_audit for select to authenticated
  using ((select cooksmith.has_application_role('admin')));
grant select on cooksmith.weekly_preparation_profile_audit to authenticated;

-- A narrow privileged capability is needed: authenticated callers deliberately have
-- no UPDATE privilege on profile or smoke columns. Never broaden those grants.
create function cooksmith_private.configure_weekly_preparation_luna_profile()
returns void language plpgsql security definer set search_path = '' as $$
declare
  previous cooksmith.weekly_preparation_settings%rowtype;
  enrichment cooksmith.recipe_intelligence_settings%rowtype;
  next_profile jsonb;
begin
  if auth.uid() is null or not cooksmith.has_application_role('admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select * into strict previous from cooksmith.weekly_preparation_settings where singleton for update;
  select * into strict enrichment from cooksmith.recipe_intelligence_settings where singleton for update;
  if previous.ai_enabled or enrichment.ai_enabled then
    raise exception 'Disable weekly and recipe AI before changing profile' using errcode = '23514';
  end if;
  if previous.corpus_version <> 'weekly-preparation-corpus-v13' then
    raise exception 'Current v13 corpus required' using errcode = '23514';
  end if;
  if exists (select 1 from cooksmith.weekly_preparation_evaluation_runs where status = 'running')
    or exists (select 1 from cooksmith.recipe_enrichment_jobs where state = 'processing') then
    raise exception 'Wait for evaluation and enrichment work to finish' using errcode = '23514';
  end if;
  -- Repeated confirmation must not erase fresh smoke evidence or append duplicate history.
  if previous.model_identifier = 'gpt-6-luna'
    and previous.prompt_version = 'weekly-preparation-strategy-v13-luna-low-v1'
    and previous.pricing_version = 'openai-luna-standard-aud-fx1_60-20261015-v1' then
    return;
  end if;
  update cooksmith.weekly_preparation_settings
  set model_identifier = 'gpt-6-luna',
      prompt_version = 'weekly-preparation-strategy-v13-luna-low-v1',
      pricing_version = 'openai-luna-standard-aud-fx1_60-20261015-v1',
      smoke_verified_at = null,
      smoke_deployment_sha = null
  where singleton;
  select jsonb_build_object('model', model_identifier, 'prompt', prompt_version,
    'pricing', pricing_version, 'corpus', corpus_version,
    'smoke_verified_at', smoke_verified_at, 'smoke_deployment_sha', smoke_deployment_sha)
    into next_profile from cooksmith.weekly_preparation_settings where singleton;
  insert into cooksmith.weekly_preparation_profile_audit(changed_by, previous_profile, profile)
  values (auth.uid(), jsonb_build_object('model', previous.model_identifier,
    'prompt', previous.prompt_version, 'pricing', previous.pricing_version,
    'corpus', previous.corpus_version, 'smoke_verified_at', previous.smoke_verified_at,
    'smoke_deployment_sha', previous.smoke_deployment_sha), next_profile);
end;
$$;

create function cooksmith.configure_weekly_preparation_luna_profile()
returns void language sql security invoker set search_path = '' as $$
  select cooksmith_private.configure_weekly_preparation_luna_profile();
$$;
revoke all on function cooksmith_private.configure_weekly_preparation_luna_profile() from public, anon;
revoke all on function cooksmith.configure_weekly_preparation_luna_profile() from public, anon;
grant execute on function cooksmith_private.configure_weekly_preparation_luna_profile() to authenticated;
grant execute on function cooksmith.configure_weekly_preparation_luna_profile() to authenticated;
comment on function cooksmith.configure_weekly_preparation_luna_profile() is
  'Admin-only audited Luna v13 low profile transition while both AI features are disabled. Does not change provider secrets, enable AI, call a model, or accept evaluation evidence.';

commit;
