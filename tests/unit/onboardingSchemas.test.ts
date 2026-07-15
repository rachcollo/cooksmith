import { describe, expect, it } from 'vitest'

import {
  dietaryPreferencesSchema,
  householdPreferencesSchema,
  profileDetailsSchema,
} from '../../src/domain/onboarding/validationSchemas'

describe('onboarding validation', () => {
  it('normalises profile and household preferences at the application boundary', () => {
    expect(
      profileDetailsSchema.parse({
        displayName: '  Sam  ',
        timezone: 'Australia/Melbourne',
        locale: 'en-AU',
      }).displayName,
    ).toBe('Sam')
    expect(
      householdPreferencesSchema.parse({
        defaultServings: 4,
        weeknightMaxMinutes: 30,
        weekendMaxMinutes: 60,
        cookingSkill: 'confident',
        budgetBand: 'standard',
        defaultStore: ' ',
        preferredPlanningDay: 0,
      }).defaultStore,
    ).toBeUndefined()
  })

  it('rejects invalid ranges and oversized dietary lists', () => {
    expect(
      householdPreferencesSchema.safeParse({
        defaultServings: 0,
        weeknightMaxMinutes: 1,
        weekendMaxMinutes: 1,
        cookingSkill: 'confident',
        budgetBand: 'standard',
        preferredPlanningDay: 7,
      }).success,
    ).toBe(false)
    expect(
      dietaryPreferencesSchema.safeParse({
        requirements: Array.from({ length: 21 }, (_, index) => `Preference ${index}`),
        allergies: [],
      }).success,
    ).toBe(false)
  })
})
