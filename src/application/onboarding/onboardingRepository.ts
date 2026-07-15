import type {
  DietaryPreferences,
  HouseholdPreferences,
  OnboardingState,
  ProfileDetails,
} from '../../domain/onboarding/types'

export interface OnboardingRepository {
  load(userId: string): Promise<OnboardingState>
  saveProfile(userId: string, profile: ProfileDetails): Promise<void>
  bootstrapHousehold(name: string): Promise<string>
  saveHouseholdPreferences(
    userId: string,
    householdId: string,
    preferences: HouseholdPreferences,
  ): Promise<void>
  completeDietaryPreferences(
    userId: string,
    householdId: string,
    preferences: DietaryPreferences,
  ): Promise<void>
}
