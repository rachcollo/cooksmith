import { describe, expect, it } from 'vitest'

import {
  allergyInputSchema,
  appUserRoleInputSchema,
  dietaryRequirementInputSchema,
  householdMembershipInputSchema,
  householdSettingsInputSchema,
  profileInputSchema,
} from '../../src/domain/households/validationSchemas'

const validSettings = {
  defaultServings: 4,
  weeknightMaxMinutes: 30,
  weekendMaxMinutes: 60,
  preferredPrepDay: 0,
  prepMode: 'quick' as const,
  defaultStore: ' Coles ',
  budgetBand: 'standard' as const,
  cookingSkill: 'confident' as const,
  cookingEnjoyment: 'neutral' as const,
}

describe('household validation schemas', () => {
  it('accepts and normalises the approved settings shape', () => {
    expect(householdSettingsInputSchema.parse(validSettings)).toEqual({
      ...validSettings,
      defaultStore: 'Coles',
    })
  })

  it('rejects settings outside database ranges', () => {
    expect(() =>
      householdSettingsInputSchema.parse({ ...validSettings, defaultServings: 0 }),
    ).toThrow()
    expect(() =>
      householdSettingsInputSchema.parse({ ...validSettings, preferredPrepDay: 7 }),
    ).toThrow()
  })

  it('keeps allergy input explicit and non-empty', () => {
    expect(allergyInputSchema.parse({ allergen: ' Peanut ' })).toEqual({ allergen: 'Peanut' })
    expect(() => allergyInputSchema.parse({ allergen: ' ' })).toThrow()
  })

  it('supports member-scoped dietary constraints with valid identifiers', () => {
    expect(
      dietaryRequirementInputSchema.parse({
        appliesToMemberId: '30000000-0000-4000-8000-000000000002',
        requirement: 'Vegetarian',
        strength: 'hard',
      }),
    ).toMatchObject({ requirement: 'Vegetarian', strength: 'hard' })

    expect(() =>
      dietaryRequirementInputSchema.parse({
        appliesToMemberId: 'not-an-id',
        requirement: 'Vegetarian',
        strength: 'hard',
      }),
    ).toThrow()
  })

  it('accepts only approved household and application roles', () => {
    expect(
      householdMembershipInputSchema.safeParse({
        userId: '10000000-0000-4000-8000-000000000001',
        role: 'owner',
        status: 'active',
      }).success,
    ).toBe(true)

    expect(
      appUserRoleInputSchema.safeParse({
        userId: '10000000-0000-4000-8000-000000000001',
        role: 'household_admin',
      }).success,
    ).toBe(false)
  })

  it('requires Australian-style locale formatting for profile input', () => {
    expect(
      profileInputSchema.parse({
        displayName: 'Owner A',
        timezone: 'Australia/Melbourne',
        locale: 'en-AU',
      }),
    ).toMatchObject({ locale: 'en-AU' })

    expect(() =>
      profileInputSchema.parse({
        displayName: 'Owner A',
        timezone: 'Australia/Melbourne',
        locale: 'en_au',
      }),
    ).toThrow()
  })
})
