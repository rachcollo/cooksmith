import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { OnboardingRepository } from '../../src/application/onboarding/onboardingRepository'
import type { OnboardingState } from '../../src/domain/onboarding/types'
import { authenticatedTestClient, renderApp } from '../renderApp'

describe('first-run onboarding', () => {
  it('persists each step, resumes from stored progress and enters the dashboard', async () => {
    let state: OnboardingState = { step: 1, complete: false }
    const saveProfile = vi.fn(async (_userId, profile) => {
      state = { step: 2, complete: false, profile: { ...profile, step: 2 } }
    })
    const bootstrapHousehold = vi.fn(async () => {
      state = { ...state, step: 3, householdId: 'household-1', householdName: 'Our home' }
      return 'household-1'
    })
    const saveHouseholdPreferences = vi.fn(async () => {
      state = { ...state, step: 4 }
    })
    const completeDietaryPreferences = vi.fn(async () => {
      state = { ...state, step: 5, complete: true }
    })
    const repository: OnboardingRepository = {
      load: async () => state,
      saveProfile,
      bootstrapHousehold,
      saveHouseholdPreferences,
      completeDietaryPreferences,
    }
    const user = userEvent.setup()
    const { router } = renderApp('/', undefined, authenticatedTestClient, repository)

    expect(await screen.findByRole('heading', { name: 'First, tell us about you' })).toBeVisible()
    await user.type(screen.getByLabelText('Display name'), 'Sam')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'Create your household' })).toBeVisible()
    await user.type(screen.getByLabelText('Household name'), 'Our home')
    await user.click(screen.getByRole('button', { name: 'Create household' }))

    expect(
      await screen.findByRole('heading', { name: 'Make planning fit real life' }),
    ).toBeVisible()
    await user.clear(screen.getByLabelText('Default servings'))
    await user.type(screen.getByLabelText('Default servings'), '3')
    await user.selectOptions(screen.getByLabelText('Cooking confidence'), 'beginner')
    await user.selectOptions(screen.getByLabelText('Grocery budget'), 'economy')
    await user.selectOptions(screen.getByLabelText('Weekly planning day'), '1')
    await user.click(screen.getByRole('button', { name: 'Save preferences' }))

    expect(await screen.findByRole('heading', { name: 'Keep every meal suitable' })).toBeVisible()
    await user.click(screen.getByLabelText('Vegetarian'))
    await user.click(screen.getByLabelText('Peanuts'))
    await user.click(screen.getByRole('button', { name: 'Finish setup' }))

    expect(
      await screen.findByRole('heading', { name: 'You’re ready to cook lighter' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Enter Cooksmith' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))

    expect(saveProfile).toHaveBeenCalledOnce()
    expect(bootstrapHousehold).toHaveBeenCalledWith('Our home')
    expect(saveHouseholdPreferences).toHaveBeenCalledWith(
      'test-user',
      'household-1',
      expect.objectContaining({ defaultServings: 3, cookingSkill: 'beginner' }),
    )
    expect(completeDietaryPreferences).toHaveBeenCalledWith('test-user', 'household-1', {
      requirements: ['Vegetarian'],
      allergies: ['Peanuts'],
    })
  })

  it('resumes directly at the persisted household-preferences step', async () => {
    const repository: OnboardingRepository = {
      load: async () => ({ step: 3, complete: false, householdId: 'household-1' }),
      saveProfile: async () => undefined,
      bootstrapHousehold: async () => 'household-1',
      saveHouseholdPreferences: async () => undefined,
      completeDietaryPreferences: async () => undefined,
    }
    renderApp('/onboarding', undefined, authenticatedTestClient, repository)
    expect(
      await screen.findByRole('heading', { name: 'Make planning fit real life' }),
    ).toBeVisible()
  })
})
