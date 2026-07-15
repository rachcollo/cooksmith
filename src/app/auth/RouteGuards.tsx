import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom'

import { LoadingState } from '../../components/ui/LoadingState'
import { safeReturnPath } from '../../application/auth/redirects'
import { useAuth } from './authContext'

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
