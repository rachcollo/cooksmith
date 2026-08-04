begin;

alter table cooksmith.weekly_preparation_evaluation_cases
  drop constraint weekly_preparation_evaluation_available_minutes_valid,
  add constraint weekly_preparation_evaluation_available_minutes_valid
    check (available_minutes is null or available_minutes in (15, 30, 45, 60));

comment on constraint weekly_preparation_evaluation_available_minutes_valid
  on cooksmith.weekly_preparation_evaluation_cases is
  'Evaluation evidence supports every release corpus duration: 15, 30, 45 or 60 minutes.';

commit;
