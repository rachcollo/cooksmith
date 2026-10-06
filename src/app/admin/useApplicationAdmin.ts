import { useEffect, useState } from 'react'
import { useAuth } from '../auth/authContext'
import { useFeatureFlagRepository } from './featureFlagContext'

type Access = 'loading' | 'allowed' | 'denied' | 'error'
export function useApplicationAdmin(): Access {
  const repository = useFeatureFlagRepository()
  const { user, loading } = useAuth()
  const userId = user?.id
  const [result, setResult] = useState<{
    userId: string
    repository: typeof repository
    access: Access
  } | null>(null)
  useEffect(() => {
    let active = true
    if (!userId || loading) return
    void repository
      .isAdmin()
      .then((allowed) => {
        if (active) setResult({ userId, repository, access: allowed ? 'allowed' : 'denied' })
      })
      .catch(() => {
        if (active) setResult({ userId, repository, access: 'error' })
      })
    return () => {
      active = false
    }
  }, [repository, userId, loading])
  if (loading || result?.userId !== userId || result?.repository !== repository) return 'loading'
  return result.access
}
