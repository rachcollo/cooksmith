import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FeatureFlagRepository } from '../../src/application/admin/featureFlagRepository'
import type { WeeklyPreparationAdminRepository } from '../../src/application/admin/weeklyPreparationAdminRepository'
import type { FeatureFlag } from '../../src/domain/admin/featureFlags'
import { renderApp } from '../renderApp'

const flag: FeatureFlag = {
  key: 'planner_apply_confirmation',
  name: 'Planner confirmation screen',
  description: 'Show a confirmation after a weekly plan is applied successfully.',
  enabled: false,
  updatedAt: '2026-07-28T00:00:00Z',
}

describe('admin feature toggles', () => {
  it('redirects a non-admin away from the protected route', async () => {
    const repository: FeatureFlagRepository = {
      isAdmin: async () => false,
      list: async () => [flag],
      update: async () => flag,
    }
    const { router } = renderApp(
      '/admin',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('heading', { name: 'Feature toggles' })).not.toBeInTheDocument()
  })

  it('lets an admin persist a typed toggle', async () => {
    const update = vi.fn(async (_key, enabled) => ({ ...flag, enabled }))
    const repository: FeatureFlagRepository = {
      isAdmin: async () => true,
      list: async () => [flag],
      update,
    }
    const user = userEvent.setup()
    renderApp(
      '/admin',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
    )
    const toggle = await screen.findByRole('checkbox', { name: /Planner confirmation screen/ })
    await user.click(toggle)
    await waitFor(() => expect(update).toHaveBeenCalledWith('planner_apply_confirmation', true))
    expect(await screen.findByText('The new setting is now active.')).toBeVisible()
  })

  it('confirms and audits the protected weekly preparation emergency stop', async () => {
    const updateSettings = vi.fn(async (input) => ({
      ...input,
      modelIdentifier: 'gpt-5-mini',
      updatedAt: '2026-07-28T01:00:00Z',
    }))
    const weeklyPreparationAdminRepository: WeeklyPreparationAdminRepository = {
      getSettings: async () => ({
        aiEnabled: false,
        emergencyStop: false,
        modelIdentifier: 'gpt-5-mini',
        updatedAt: '2026-07-28T00:00:00Z',
      }),
      updateSettings,
      getLatestEvaluation: async () => null,
      getRecipeEnrichmentStatus: async () => ({
        paused: false,
        aiEnabled: false,
        monthlyCostLimitAud: 10,
        recoverableCount: 1,
        sources: {
          household: { eligible: 2, current: 0 },
          sharedPlatform: { eligible: 19, current: 0 },
        },
        states: {},
        latestProviderFailure: {
          httpStatus: 400,
          errorCode: 'invalid_request_error',
          errorParam: 'text.format.type',
          requestId: 'req_synthetic_diagnostic',
          failedAt: '2026-07-29T09:00:00Z',
        },
      }),
      commandRecipeEnrichment: async () => ({
        paused: false,
        aiEnabled: false,
        monthlyCostLimitAud: 10,
        recoverableCount: 1,
        sources: {
          household: { eligible: 2, current: 0 },
          sharedPlatform: { eligible: 19, current: 0 },
        },
        states: {},
        latestProviderFailure: null,
      }),
      setRecipeIntelligenceAi: async (enabled) => ({
        paused: false,
        aiEnabled: enabled,
        monthlyCostLimitAud: 10,
        recoverableCount: 1,
        sources: {
          household: { eligible: 2, current: 0 },
          sharedPlatform: { eligible: 19, current: 0 },
        },
        states: {},
        latestProviderFailure: null,
      }),
    }
    const repository: FeatureFlagRepository = {
      isAdmin: async () => true,
      list: async () => [flag],
      update: async () => flag,
    }
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp(
      '/admin',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      repository,
      undefined,
      weeklyPreparationAdminRepository,
    )

    expect(await screen.findByText('Latest AI provider error')).toBeVisible()
    expect(screen.getByText('HTTP 400 · invalid_request_error · text.format.type')).toBeVisible()
    expect(screen.getByText('Request ID: req_synthetic_diagnostic')).toBeVisible()

    await user.click(
      await screen.findByRole('button', {
        name: 'Activate emergency stop',
      }),
    )
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith({
        aiEnabled: false,
        emergencyStop: true,
      }),
    )
    expect(
      await screen.findByText('Weekly preparation controls updated and recorded in the audit log.'),
    ).toBeVisible()
  })
})
