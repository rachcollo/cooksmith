import type { FeatureFlagRepository } from '../../application/admin/featureFlagRepository'
import {
  FEATURE_FLAG_KEYS,
  type FeatureFlag,
  type FeatureFlagKey,
} from '../../domain/admin/featureFlags'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

interface FlagRow {
  key: string
  name: string
  description: string
  enabled: boolean
  updated_at: string
}

function fromRow(row: FlagRow): FeatureFlag {
  if (!FEATURE_FLAG_KEYS.includes(row.key as FeatureFlagKey))
    throw new Error('Cooksmith received an unsupported feature toggle.')
  return {
    key: row.key as FeatureFlagKey,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  }
}

export function createSupabaseFeatureFlagRepository(
  client: CooksmithSupabaseClient,
): FeatureFlagRepository {
  const database = client.schema('cooksmith')
  return {
    async isAdmin() {
      const { data, error } = await database.rpc('has_application_role', {
        required_role: 'admin',
      })
      if (error) throw new Error('Cooksmith could not verify administrator access.')
      return data === true
    },
    async list() {
      const { data, error } = await database
        .from('feature_flags')
        .select('key, name, description, enabled, updated_at')
        .order('key')
      if (error) throw new Error('Cooksmith could not load feature toggles.')
      return (data as FlagRow[]).map(fromRow)
    },
    async update(key, enabled) {
      const { data, error } = await database
        .from('feature_flags')
        .update({ enabled })
        .eq('key', key)
        .select('key, name, description, enabled, updated_at')
        .single()
      if (error) throw new Error('Cooksmith could not update this feature toggle.')
      return fromRow(data as FlagRow)
    },
  }
}
