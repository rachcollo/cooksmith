export const FEATURE_FLAG_KEYS = ['planner_apply_confirmation'] as const
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number]

export interface FeatureFlag {
  key: FeatureFlagKey
  name: string
  description: string
  enabled: boolean
  updatedAt: string
}

export const FEATURE_FLAG_DEFAULTS: Record<FeatureFlagKey, boolean> = {
  planner_apply_confirmation: false,
}
