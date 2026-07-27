import type { HouseholdPreferencesRepository } from '../../application/households/householdPreferencesRepository'
import {
  EMPTY_HOUSEHOLD_PREFERENCE_PROFILE,
  householdPreferenceProfileSchema,
  type HouseholdPreferenceProfile,
} from '../../domain/households/preferences'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

interface PreferenceRow {
  people: unknown
  dietary_requirements: string[] | null
  favourite_cuisines: string[] | null
  liked_foods: string[] | null
  avoided_foods: string[] | null
  cooking_confidence: string | null
  weeknight_time: string | null
  preferred_store: string | null
  updated_at: string
}

function fromRow(row: PreferenceRow | null): HouseholdPreferenceProfile {
  if (!row) return { ...EMPTY_HOUSEHOLD_PREFERENCE_PROFILE }
  return householdPreferenceProfileSchema.parse({
    people: row.people ?? [],
    dietaryRequirements: row.dietary_requirements ?? [],
    favouriteCuisines: row.favourite_cuisines ?? [],
    likedFoods: row.liked_foods ?? [],
    avoidedFoods: row.avoided_foods ?? [],
    cookingConfidence: row.cooking_confidence ?? undefined,
    weeknightTime: row.weeknight_time ?? undefined,
    preferredStore: row.preferred_store ?? undefined,
    updatedAt: row.updated_at,
  })
}

export function createSupabaseHouseholdPreferencesRepository(
  client: CooksmithSupabaseClient,
): HouseholdPreferencesRepository {
  const database = client.schema('cooksmith')
  return {
    async load(householdId) {
      const { data, error } = await database
        .from('household_preference_profiles')
        .select(
          'people, dietary_requirements, favourite_cuisines, liked_foods, avoided_foods, cooking_confidence, weeknight_time, preferred_store, updated_at',
        )
        .eq('household_id', householdId)
        .maybeSingle()
      if (error) throw new Error('Cooksmith could not load your household preferences.')
      return fromRow(data as PreferenceRow | null)
    },
    async save(householdId, profile) {
      const valid = householdPreferenceProfileSchema.parse(profile)
      const people = valid.people.map((person) => ({
        ...person,
        id: person.id ?? crypto.randomUUID(),
      }))
      const { data, error } = await database
        .from('household_preference_profiles')
        .upsert(
          {
            household_id: householdId,
            people,
            dietary_requirements: valid.dietaryRequirements,
            favourite_cuisines: valid.favouriteCuisines,
            liked_foods: valid.likedFoods,
            avoided_foods: valid.avoidedFoods,
            cooking_confidence: valid.cookingConfidence ?? null,
            weeknight_time: valid.weeknightTime ?? null,
            preferred_store: valid.preferredStore || null,
          },
          { onConflict: 'household_id' },
        )
        .select(
          'people, dietary_requirements, favourite_cuisines, liked_foods, avoided_foods, cooking_confidence, weeknight_time, preferred_store, updated_at',
        )
        .single()
      if (error) throw new Error('Cooksmith could not save your household preferences. Try again.')
      return fromRow(data as PreferenceRow)
    },
  }
}
