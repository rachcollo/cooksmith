import { describe, expect, it } from 'vitest'

import {
  householdPreferenceProfileSchema,
  toRecommendationProfile,
} from '../../src/domain/households/preferences'

describe('household preference profile', () => {
  it('accepts a partial profile and keeps hard constraints separate from soft preferences', () => {
    const profile = householdPreferenceProfileSchema.parse({
      people: [
        {
          id: '4f879b0d-6381-42c1-87f9-4db924760832',
          displayName: 'Sam',
          allergies: ['peanut'],
          intolerances: [],
        },
      ],
      dietaryRequirements: ['vegetarian'],
      favouriteCuisines: ['thai'],
      likedFoods: [],
      avoidedFoods: ['mushroom'],
    })

    expect(toRecommendationProfile(profile)).toEqual({
      hardConstraints: {
        householdDietaryRequirements: ['vegetarian'],
        people: [
          {
            personId: '4f879b0d-6381-42c1-87f9-4db924760832',
            displayName: 'Sam',
            allergies: ['peanut'],
            intolerances: [],
          },
        ],
      },
      softPreferences: {
        favouriteCuisines: ['thai'],
        likedFoods: [],
        avoidedFoods: ['mushroom'],
      },
    })
  })

  it('rejects unstable cooking option identifiers', () => {
    expect(
      householdPreferenceProfileSchema.safeParse({
        people: [],
        dietaryRequirements: [],
        favouriteCuisines: [],
        likedFoods: [],
        avoidedFoods: [],
        cookingConfidence: 'expert',
      }).success,
    ).toBe(false)
  })
})
