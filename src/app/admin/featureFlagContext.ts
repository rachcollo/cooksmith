import { createContext, useContext } from 'react'

import type { FeatureFlagRepository } from '../../application/admin/featureFlagRepository'
import type { FeatureFlagKey } from '../../domain/admin/featureFlags'

export interface FeatureFlagContextValue {
  loading: boolean
  enabled(key: FeatureFlagKey): boolean
  refresh(): Promise<void>
}

export const FeatureFlagRepositoryContext = createContext<FeatureFlagRepository | null>(null)
export const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null)

export function useFeatureFlags() {
  const value = useContext(FeatureFlagContext)
  if (!value) throw new Error('useFeatureFlags must be used inside FeatureFlagProvider.')
  return value
}

export function useFeatureFlagRepository() {
  const value = useContext(FeatureFlagRepositoryContext)
  if (!value) throw new Error('Feature flag administration is not configured.')
  return value
}
