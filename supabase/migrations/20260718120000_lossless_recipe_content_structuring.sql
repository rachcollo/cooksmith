begin;

alter table cooksmith.recipe_ingredients
  add column if not exists original_line_text text,
  add column if not exists parser_version text not null default 'recipe-content-v1',
  add column if not exists derivation_status text not null default 'derived',
  add column if not exists derived_at timestamptz not null default now(),
  add constraint recipe_ingredients_original_line_text_length check (original_line_text is null or char_length(btrim(original_line_text)) between 1 and 4000),
  add constraint recipe_ingredients_parser_version_required check (char_length(btrim(parser_version)) between 1 and 80),
  add constraint recipe_ingredients_derivation_status_valid check (derivation_status in ('derived', 'display_only', 'failed'));

alter table cooksmith.recipe_steps
  add column if not exists original_line_text text,
  add column if not exists parser_version text not null default 'recipe-content-v1',
  add column if not exists derivation_status text not null default 'derived',
  add column if not exists derived_at timestamptz not null default now(),
  add constraint recipe_steps_original_line_text_length check (original_line_text is null or char_length(btrim(original_line_text)) between 1 and 5000),
  add constraint recipe_steps_parser_version_required check (char_length(btrim(parser_version)) between 1 and 80),
  add constraint recipe_steps_derivation_status_valid check (derivation_status in ('derived', 'failed'));

update cooksmith.recipe_ingredients
set original_line_text = coalesce(original_line_text, ingredient_name),
    parser_version = coalesce(nullif(btrim(parser_version), ''), 'recipe-content-v1'),
    derivation_status = coalesce(nullif(btrim(derivation_status), ''), 'derived'),
    derived_at = coalesce(derived_at, updated_at, created_at, now())
where original_line_text is null;

update cooksmith.recipe_steps
set original_line_text = coalesce(original_line_text, instruction),
    parser_version = coalesce(nullif(btrim(parser_version), ''), 'recipe-content-v1'),
    derivation_status = coalesce(nullif(btrim(derivation_status), ''), 'derived'),
    derived_at = coalesce(derived_at, updated_at, created_at, now())
where original_line_text is null;

alter table cooksmith.recipe_ingredients
  alter column original_line_text set not null;

alter table cooksmith.recipe_steps
  alter column original_line_text set not null;

create index if not exists recipe_ingredients_recipe_parser_idx on cooksmith.recipe_ingredients (recipe_id, parser_version, position);
create index if not exists recipe_steps_recipe_parser_idx on cooksmith.recipe_steps (recipe_id, parser_version, position);

comment on column cooksmith.recipe_ingredients.original_line_text is 'Lossless trimmed source line used to derive this ingredient display record.';
comment on column cooksmith.recipe_ingredients.parser_version is 'Deterministic parser version that created the derived ingredient row.';
comment on column cooksmith.recipe_ingredients.derivation_status is 'Observable derivation state; display_only means no confident normalisation was invented.';
comment on column cooksmith.recipe_steps.original_line_text is 'Lossless trimmed source line used to derive this instruction step.';
comment on column cooksmith.recipe_steps.parser_version is 'Deterministic parser version that created the derived instruction row.';
comment on column cooksmith.recipe_steps.derivation_status is 'Observable derivation state for safe retry and diagnostics.';

commit;
