import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import type { OnboardingState } from '../../domain/onboarding/types'
import { createSupabaseOnboardingRepository } from '../../infrastructure/onboarding/supabaseOnboardingRepository'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../auth/authContext'
import { OnboardingContext, OnboardingRepositoryContext } from './onboardingContext'

export function OnboardingGate() {
  const auth = useAuth()
  const location = useLocation()
  const supplied = useContext(OnboardingRepositoryContext)
  const repository = useMemo(
    () => supplied ?? (auth.client ? createSupabaseOnboardingRepository(auth.client) : null),
    [auth.client, supplied],
  )
  const [state, setState] = useState<OnboardingState | null>(null)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    if (!repository || !auth.user) throw new Error('Onboarding is not configured.')
    const next = await repository.load(auth.user.id)
    setState(next)
    setError(false)
    return next
  }, [auth.user, repository])

  useEffect(() => {
    let active = true
    if (repository && auth.user) {
      void repository
        .load(auth.user.id)
        .then((next) => {
          if (active) setState(next)
        })
        .catch(() => {
          if (active) setError(true)
        })
    }
    return () => {
      active = false
    }
  }, [auth.user, repository])

  if (error)
    return (
      <ErrorState
        title="We couldn’t check your setup"
        message="Your details are safe. Try loading Cooksmith again."
        actionLabel="Try again"
        onAction={() => void refresh()}
      />
    )
  if (!state || !repository) return <LoadingState label="Checking your Cooksmith setup" fullPage />

  const onOnboardingRoute = location.pathname === '/onboarding'
  if (!state.complete && !onOnboardingRoute) return <Navigate replace to="/onboarding" />
  if (state.complete && onOnboardingRoute) return <Navigate replace to="/" />

  return (
    <OnboardingContext.Provider value={{ repository, state, refresh }}>
      <Outlet />
    </OnboardingContext.Provider>
  )
}
