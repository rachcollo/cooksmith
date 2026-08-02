begin;

alter table cooksmith.weekly_preparation_evaluation_cases
  add column available_minutes integer,
  add column meal_names text[] not null default '{}',
  add column generated_tasks jsonb not null default '[]'::jsonb,
  add constraint weekly_preparation_evaluation_available_minutes_valid
    check (available_minutes is null or available_minutes in (15, 30, 60)),
  add constraint weekly_preparation_evaluation_generated_tasks_array
    check (jsonb_typeof(generated_tasks) = 'array');

comment on column cooksmith.weekly_preparation_evaluation_cases.available_minutes is
  'Synthetic evaluation time budget shown to administrators during failed-case review.';
comment on column cooksmith.weekly_preparation_evaluation_cases.meal_names is
  'Synthetic recipe names used by the evaluation case; never household recipe data.';
comment on column cooksmith.weekly_preparation_evaluation_cases.generated_tasks is
  'Privacy-safe structured model task evidence for administrator quality review.';

commit;
