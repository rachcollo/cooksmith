import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  Constants,
  type Database,
  type Enums,
  type Tables,
  type TablesInsert,
} from '../../src/infrastructure/database/generated/database.types'

describe('generated database API contract', () => {
  it('contains the complete private table surface', () => {
    type TablesContract = keyof Database['cooksmith']['Tables']
    expectTypeOf<TablesContract>().toEqualTypeOf<
      | 'app_user_roles'
      | 'feature_flag_audit'
      | 'feature_flags'
      | 'household_allergies'
      | 'household_dietary_requirements'
      | 'household_invitations'
      | 'household_members'
      | 'household_pantry_items'
      | 'household_preference_profiles'
      | 'household_recipes'
      | 'household_settings'
      | 'households'
      | 'imported_recipes'
      | 'infrastructure_health'
      | 'planned_meals'
      | 'profiles'
      | 'recipe_ingredients'
      | 'recipe_content_versions'
      | 'recipe_enrichment_jobs'
      | 'recipe_enrichments'
      | 'recipe_intelligence_settings'
      | 'recipe_steps'
      | 'shopping_item_contributions'
      | 'shopping_list_items'
      | 'shopping_lists'
      | 'weekly_preparation_plans'
      | 'weekly_preparation_settings'
    >()
  })

  it('keeps required identifiers and generated values aligned with the schema', () => {
    expectTypeOf<
      Tables<{ schema: 'cooksmith' }, 'household_members'>['household_id']
    >().toEqualTypeOf<string>()
    expectTypeOf<
      TablesInsert<{ schema: 'cooksmith' }, 'household_allergies'>['normalised_allergen']
    >().toEqualTypeOf<string | null | undefined>()
    expectTypeOf<Enums<{ schema: 'cooksmith' }, 'household_role'>>().toEqualTypeOf<
      'owner' | 'member'
    >()
    expectTypeOf<
      Database['cooksmith']['Functions']['bootstrap_household']['Returns']
    >().toEqualTypeOf<string>()
  })

  it('exports runtime enum constants that match validation and policy inputs', () => {
    expect(Constants.cooksmith.Enums.household_role).toEqual(['owner', 'member'])
    expect(Constants.cooksmith.Enums.pantry_item_category).toContain('grains_rice_and_pasta')
    expect(Constants.cooksmith.Enums.membership_status).toEqual(['active', 'inactive'])
    expect(Constants.cooksmith.Enums.meal_type).toEqual(['breakfast', 'lunch', 'dinner'])
    expect(Constants.cooksmith.Enums.shopping_item_category).toContain('produce')
    expect(Constants.cooksmith.Enums.imported_recipe_visibility).toEqual(['public', 'private'])
    expect(Constants.cooksmith.Enums.application_role).toEqual([
      'admin',
      'content_editor',
      'support',
    ])
    expect(Constants.cooksmith.Enums.recipe_enrichment_job_state).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
    ])
  })
})
