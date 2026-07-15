import type { BudgetBand, CookingSkill } from '../households/types'

export type OnboardingStep = 1 | 2 | 3 | 4 | 5

export interface OnboardingProfile {
  displayName: string
  timezone: string
  locale: string
  step: OnboardingStep
  completedAt?: string
}

export interface OnboardingState {
  profile?: OnboardingProfile
  householdId?: string
  householdName?: string
  preferences?: HouseholdPreferences
  dietary?: DietaryPreferences
  step: OnboardingStep
  complete: boolean
}

export interface ProfileDetails {
  displayName: string
  timezone: string
  locale: string
}

export interface HouseholdPreferences {
  defaultServings: number
  weeknightMaxMinutes: number
  weekendMaxMinutes: number
  cookingSkill: CookingSkill
  budgetBand: BudgetBand
  defaultStore?: string
  preferredPlanningDay: number
}

export interface DietaryPreferences {
  requirements: string[]
  allergies: string[]
}
