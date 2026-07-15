import { createContext, useContext } from 'react'

import type { OnboardingRepository } from '../../application/onboarding/onboardingRepository'
import type { OnboardingState } from '../../domain/onboarding/types'

export interface OnboardingContextValue {
  repository: OnboardingRepository
  state: OnboardingState
  refresh(): Promise<OnboardingState>
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(null)
export const OnboardingRepositoryContext = createContext<OnboardingRepository | undefined>(
  undefined,
)

export function useOnboarding() {
  const value = useContext(OnboardingContext)
  if (!value) throw new Error('useOnboarding must be used inside OnboardingGate.')
  return value
}
