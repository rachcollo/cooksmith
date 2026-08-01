begin;

alter table cooksmith.weekly_preparation_settings
  disable trigger weekly_preparation_settings_audit_change;

update cooksmith.weekly_preparation_settings
set
  ai_enabled = false,
  corpus_version = 'weekly-preparation-corpus-v3',
  smoke_verified_at = null,
  smoke_deployment_sha = null
where singleton;

alter table cooksmith.weekly_preparation_settings
  enable trigger weekly_preparation_settings_audit_change;

comment on column cooksmith.weekly_preparation_evaluation_cases.reason_code is
  'Privacy-safe deterministic validation or product-quality review reason for a failed case.';

commit;
