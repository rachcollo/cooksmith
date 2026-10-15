begin;

-- Version the fixed admin command; deployment does not change live settings.
create or replace function cooksmith_private.configure_weekly_preparation_luna_profile()
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
    and previous.prompt_version = 'weekly-preparation-strategy-v13-luna-low-v2'
    and previous.pricing_version = 'openai-luna-standard-aud-fx1_60-20261015-v1' then
    return;
  end if;
  update cooksmith.weekly_preparation_settings
  set model_identifier = 'gpt-6-luna',
      prompt_version = 'weekly-preparation-strategy-v13-luna-low-v2',
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

commit;
