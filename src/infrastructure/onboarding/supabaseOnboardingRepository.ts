import type { PostgrestError } from '@supabase/supabase-js'

import type { OnboardingRepository } from '../../application/onboarding/onboardingRepository'
import type {
  DietaryPreferences,
  HouseholdPreferences,
  OnboardingState,
  OnboardingStep,
  ProfileDetails,
} from '../../domain/onboarding/types'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

function ensure(error: PostgrestError | null) {
  if (error) throw new Error('Cooksmith could not save your onboarding details. Please try again.')
}

export function createSupabaseOnboardingRepository(
  client: CooksmithSupabaseClient,
): OnboardingRepository {
  const database = client.schema('cooksmith')

  return {
    async load(userId): Promise<OnboardingState> {
      const profileResult = await database
        .from('profiles')
        .select('display_name, timezone, locale, onboarding_step, onboarding_completed_at')
        .eq('id', userId)
        .maybeSingle()
      ensure(profileResult.error)
      const profile = profileResult.data
      if (!profile) return { step: 1, complete: false }

      const membershipResult = await database
        .from('household_members')
        .select('household_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at')
        .limit(1)
        .maybeSingle()
      ensure(membershipResult.error)
      const householdId = membershipResult.data?.household_id
      let householdName: string | undefined
      let preferences: HouseholdPreferences | undefined
      let dietary: DietaryPreferences | undefined
      if (householdId) {
        const householdResult = await database
          .from('households')
          .select('name')
          .eq('id', householdId)
          .single()
        ensure(householdResult.error)
        if (!householdResult.data) throw new Error('Cooksmith could not load your household.')
        householdName = householdResult.data.name

        const settingsResult = await database
          .from('household_settings')
          .select(
            'default_servings, weeknight_max_minutes, weekend_max_minutes, cooking_skill, budget_band, default_store, preferred_prep_day',
          )
          .eq('household_id', householdId)
          .single()
        ensure(settingsResult.error)
        if (settingsResult.data) {
          preferences = {
            defaultServings: settingsResult.data.default_servings,
            weeknightMaxMinutes: settingsResult.data.weeknight_max_minutes,
            weekendMaxMinutes: settingsResult.data.weekend_max_minutes,
            cookingSkill: settingsResult.data.cooking_skill,
            budgetBand: settingsResult.data.budget_band,
            defaultStore: settingsResult.data.default_store ?? undefined,
            preferredPlanningDay: settingsResult.data.preferred_prep_day ?? 0,
          }
        }

        const [requirementsResult, allergiesResult] = await Promise.all([
          database
            .from('household_dietary_requirements')
            .select('requirement')
            .eq('household_id', householdId)
            .is('applies_to_member_id', null),
          database
            .from('household_allergies')
            .select('allergen')
            .eq('household_id', householdId)
            .is('applies_to_member_id', null),
        ])
        ensure(requirementsResult.error)
        ensure(allergiesResult.error)
        dietary = {
          requirements: (requirementsResult.data ?? []).map(({ requirement }) => requirement),
          allergies: (allergiesResult.data ?? []).map(({ allergen }) => allergen),
        }
      }

      const storedStep = profile.onboarding_step as OnboardingStep
      const step = householdId ? storedStep : storedStep > 2 ? 2 : storedStep
      return {
        profile: {
          displayName: profile.display_name,
          timezone: profile.timezone,
          locale: profile.locale,
          step,
          completedAt: profile.onboarding_completed_at ?? undefined,
        },
        householdId,
        householdName,
        preferences,
        dietary,
        step,
        complete: Boolean(householdId && profile.onboarding_completed_at),
      }
    },

    async saveProfile(userId: string, profile: ProfileDetails) {
      const { error } = await database.from('profiles').upsert({
        id: userId,
        display_name: profile.displayName,
        timezone: profile.timezone,
        locale: profile.locale,
        onboarding_step: 2,
      })
      ensure(error)
    },

    async bootstrapHousehold(name: string) {
      const { data, error } = await database.rpc('bootstrap_household', {
        p_household_name: name,
      })
      ensure(error)
      if (!data) throw new Error('Cooksmith could not create your household. Please try again.')
      return data
    },

    async saveHouseholdPreferences(
      userId: string,
      householdId: string,
      preferences: HouseholdPreferences,
    ) {
      const settings = await database
        .from('household_settings')
        .update({
          default_servings: preferences.defaultServings,
          weeknight_max_minutes: preferences.weeknightMaxMinutes,
          weekend_max_minutes: preferences.weekendMaxMinutes,
          cooking_skill: preferences.cookingSkill,
          budget_band: preferences.budgetBand,
          default_store: preferences.defaultStore ?? null,
          preferred_prep_day: preferences.preferredPlanningDay,
          updated_by: userId,
        })
        .eq('household_id', householdId)
      ensure(settings.error)
      const profile = await database
        .from('profiles')
        .update({ onboarding_step: 4 })
        .eq('id', userId)
      ensure(profile.error)
    },

    async completeDietaryPreferences(
      userId: string,
      householdId: string,
      preferences: DietaryPreferences,
    ) {
      const dietaryDelete = await database
        .from('household_dietary_requirements')
        .delete()
        .eq('household_id', householdId)
        .is('applies_to_member_id', null)
      ensure(dietaryDelete.error)
      const allergyDelete = await database
        .from('household_allergies')
        .delete()
        .eq('household_id', householdId)
        .is('applies_to_member_id', null)
      ensure(allergyDelete.error)

      if (preferences.requirements.length) {
        const dietaryInsert = await database.from('household_dietary_requirements').insert(
          preferences.requirements.map((requirement) => ({
            household_id: householdId,
            requirement,
            strength: 'hard' as const,
            created_by: userId,
            updated_by: userId,
          })),
        )
        ensure(dietaryInsert.error)
      }
      if (preferences.allergies.length) {
        const allergyInsert = await database.from('household_allergies').insert(
          preferences.allergies.map((allergen) => ({
            household_id: householdId,
            allergen,
            created_by: userId,
            updated_by: userId,
          })),
        )
        ensure(allergyInsert.error)
      }

      const profile = await database
        .from('profiles')
        .update({ onboarding_step: 5, onboarding_completed_at: new Date().toISOString() })
        .eq('id', userId)
      ensure(profile.error)
    },
  }
}
