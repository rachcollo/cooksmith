import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { LoadingState } from '../../components/ui/LoadingState'
import { safeReturnPath } from '../../application/auth/redirects'
import { useAuth } from './authContext'
import { useFeatureFlagRepository } from '../admin/featureFlagContext'
import { ErrorState } from '../../components/ui/ErrorState'

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <LoadingState label="Restoring your Cooksmith session" fullPage />
  if (!auth.user)
    return (
      <Navigate
        replace
        to={`/welcome?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
      />
    )
  return <Outlet />
}

export function PublicOnlyRoute() {
  const auth = useAuth()
  const [params] = useSearchParams()
  if (auth.loading) return <LoadingState label="Checking your Cooksmith session" fullPage />
  if (auth.user) return <Navigate replace to={safeReturnPath(params.get('returnTo'))} />
  return <Outlet />
}

export function RequireApplicationAdmin() {
  const repository = useFeatureFlagRepository()
  const [state, setState] = useState<'loading' | 'allowed' | 'denied' | 'error'>('loading')

  useEffect(() => {
    let active = true
    void repository
      .isAdmin()
      .then((allowed) => {
        if (active) setState(allowed ? 'allowed' : 'denied')
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [repository])

  if (state === 'loading') return <LoadingState label="Checking administrator access" />
  if (state === 'error')
    return (
      <ErrorState
        title="We couldn’t verify access"
        message="Your settings are safe. Try opening the admin portal again."
      />
    )
  if (state === 'denied') return <Navigate replace to="/" />
  return <Outlet />
}
