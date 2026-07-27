import { z } from 'zod'

export const COOKING_CONFIDENCE_OPTIONS = ['beginner', 'comfortable', 'confident'] as const
export const WEEKNIGHT_TIME_OPTIONS = ['up_to_20', 'up_to_30', 'up_to_45', 'flexible'] as const

export const cookedForPersonSchema = z.object({
  id: z.string().uuid().optional(),
  displayName: z.string().trim().min(1, 'Enter a name.').max(80),
  allergies: z.array(z.string().trim().min(1).max(100)).max(30),
  intolerances: z.array(z.string().trim().min(1).max(100)).max(30),
})

export const householdPreferenceProfileSchema = z.object({
  people: z.array(cookedForPersonSchema).max(30),
  dietaryRequirements: z.array(z.string().trim().min(1).max(100)).max(30),
  favouriteCuisines: z.array(z.string().trim().min(1).max(100)).max(30),
  likedFoods: z.array(z.string().trim().min(1).max(100)).max(50),
  avoidedFoods: z.array(z.string().trim().min(1).max(100)).max(50),
  cookingConfidence: z.enum(COOKING_CONFIDENCE_OPTIONS).optional(),
  weeknightTime: z.enum(WEEKNIGHT_TIME_OPTIONS).optional(),
  preferredStore: z.string().trim().max(100).optional(),
  updatedAt: z.string().optional(),
})

export type CookedForPerson = z.infer<typeof cookedForPersonSchema>
export type HouseholdPreferenceProfile = z.infer<typeof householdPreferenceProfileSchema>

export interface HouseholdRecommendationProfile {
  hardConstraints: {
    householdDietaryRequirements: string[]
    people: Array<{
      personId: string
      displayName: string
      allergies: string[]
      intolerances: string[]
    }>
  }
  softPreferences: {
    favouriteCuisines: string[]
    likedFoods: string[]
    avoidedFoods: string[]
    cookingConfidence?: (typeof COOKING_CONFIDENCE_OPTIONS)[number]
    weeknightTime?: (typeof WEEKNIGHT_TIME_OPTIONS)[number]
    preferredStore?: string
  }
}

export const EMPTY_HOUSEHOLD_PREFERENCE_PROFILE: HouseholdPreferenceProfile = {
  people: [],
  dietaryRequirements: [],
  favouriteCuisines: [],
  likedFoods: [],
  avoidedFoods: [],
}

export function toRecommendationProfile(
  profile: HouseholdPreferenceProfile,
): HouseholdRecommendationProfile {
  return {
    hardConstraints: {
      householdDietaryRequirements: profile.dietaryRequirements,
      people: profile.people
        .filter((person): person is CookedForPerson & { id: string } => Boolean(person.id))
        .map((person) => ({
          personId: person.id,
          displayName: person.displayName,
          allergies: person.allergies,
          intolerances: person.intolerances,
        })),
    },
    softPreferences: {
      favouriteCuisines: profile.favouriteCuisines,
      likedFoods: profile.likedFoods,
      avoidedFoods: profile.avoidedFoods,
      cookingConfidence: profile.cookingConfidence,
      weeknightTime: profile.weeknightTime,
      preferredStore: profile.preferredStore,
    },
  }
}
