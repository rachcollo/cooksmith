-- Synthetic infrastructure-only seed. Safe to repeat after local resets.
insert into cooksmith.infrastructure_health (key, value)
values ('milestone_3_baseline', 'ready')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

-- Deterministic synthetic identities for local and Preview validation only.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{}',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  )
on conflict (id) do update
set updated_at = excluded.updated_at;

insert into cooksmith.profiles (id, display_name, timezone, locale, created_at, updated_at)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Owner A',
    'Australia/Melbourne',
    'en-AU',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Member A',
    'Australia/Melbourne',
    'en-AU',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'Owner B',
    'Australia/Brisbane',
    'en-AU',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Unrelated User',
    'Australia/Perth',
    'en-AU',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  )
on conflict (id) do update
set display_name = excluded.display_name,
    timezone = excluded.timezone,
    locale = excluded.locale,
    updated_at = excluded.updated_at;

insert into cooksmith.households (
  id,
  name,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'Household A',
    'active',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Household B',
    'active',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  )
on conflict (id) do update
set name = excluded.name,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

insert into cooksmith.household_members (
  id,
  household_id,
  user_id,
  role,
  status,
  joined_at,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    '2026-07-14 00:00:00+00',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
    'member',
    'active',
    '2026-07-14 00:00:00+00',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000003',
    'owner',
    'active',
    '2026-07-14 00:00:00+00',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  )
on conflict (household_id, user_id) do update
set role = excluded.role,
    status = excluded.status,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

insert into cooksmith.household_settings (
  household_id,
  default_servings,
  weeknight_max_minutes,
  weekend_max_minutes,
  preferred_prep_day,
  prep_mode,
  default_store,
  budget_band,
  cooking_skill,
  cooking_enjoyment,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    4,
    30,
    60,
    0,
    'quick',
    'Coles',
    'standard',
    'confident',
    'neutral',
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    2,
    20,
    45,
    null,
    'no_prep',
    'Woolworths',
    'economy',
    'beginner',
    'low',
    '10000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000003',
    '2026-07-14 00:00:00+00',
    '2026-07-14 00:00:00+00'
  )
on conflict (household_id) do update
set default_servings = excluded.default_servings,
    weeknight_max_minutes = excluded.weeknight_max_minutes,
    weekend_max_minutes = excluded.weekend_max_minutes,
    preferred_prep_day = excluded.preferred_prep_day,
    prep_mode = excluded.prep_mode,
    default_store = excluded.default_store,
    budget_band = excluded.budget_band,
    cooking_skill = excluded.cooking_skill,
    cooking_enjoyment = excluded.cooking_enjoyment,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

insert into cooksmith.household_dietary_requirements (
  id,
  household_id,
  applies_to_member_id,
  requirement,
  strength,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values (
  '40000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'Vegetarian',
  'hard',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-14 00:00:00+00',
  '2026-07-14 00:00:00+00'
)
on conflict (id) do update
set requirement = excluded.requirement,
    strength = excluded.strength,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;

insert into cooksmith.household_allergies (
  id,
  household_id,
  applies_to_member_id,
  allergen,
  notes,
  created_by,
  updated_by,
  created_at,
  updated_at
)
values (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  'Peanut',
  'Synthetic hard constraint for database validation.',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '2026-07-14 00:00:00+00',
  '2026-07-14 00:00:00+00'
)
on conflict (id) do update
set allergen = excluded.allergen,
    notes = excluded.notes,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at;
