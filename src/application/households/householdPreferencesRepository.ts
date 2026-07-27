import type { HouseholdPreferenceProfile } from '../../domain/households/preferences'

export interface HouseholdPreferencesRepository {
  load(householdId: string): Promise<HouseholdPreferenceProfile>
  save(
    householdId: string,
    profile: HouseholdPreferenceProfile,
  ): Promise<HouseholdPreferenceProfile>
}
