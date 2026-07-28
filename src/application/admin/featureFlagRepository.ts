import type { FeatureFlag, FeatureFlagKey } from '../../domain/admin/featureFlags'

export interface FeatureFlagRepository {
  isAdmin(): Promise<boolean>
  list(): Promise<FeatureFlag[]>
  update(key: FeatureFlagKey, enabled: boolean): Promise<FeatureFlag>
}
