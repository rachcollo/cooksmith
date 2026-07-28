import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { FEATURE_FLAG_DEFAULTS, type FeatureFlagKey } from '../../domain/admin/featureFlags'
import { useAuth } from '../auth/authContext'
import { FeatureFlagContext, FeatureFlagRepositoryContext } from './featureFlagContext'

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const repository = useContext(FeatureFlagRepositoryContext)
  const { user } = useAuth()
  const [flags, setFlags] = useState<Partial<Record<FeatureFlagKey, boolean>>>({})
  const [loading, setLoading] = useState(Boolean(repository && user))

  const refresh = useCallback(async () => {
    if (!repository || !user) {
      setFlags({})
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const rows = await repository.list()
      setFlags(Object.fromEntries(rows.map((flag) => [flag.key, flag.enabled])))
    } catch {
      setFlags({})
    } finally {
      setLoading(false)
    }
  }, [repository, user])

  useEffect(() => {
    let active = true
    if (!repository || !user) return undefined
    void repository
      .list()
      .then((rows) => {
        if (active) setFlags(Object.fromEntries(rows.map((flag) => [flag.key, flag.enabled])))
      })
      .catch(() => {
        if (active) setFlags({})
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [repository, user])

  const value = useMemo(
    () => ({
      loading,
      enabled: (key: FeatureFlagKey) => flags[key] ?? FEATURE_FLAG_DEFAULTS[key],
      refresh,
    }),
    [flags, loading, refresh],
  )

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}
