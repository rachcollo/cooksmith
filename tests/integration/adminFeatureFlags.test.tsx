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
      corpusVersion: 'weekly-preparation-corpus-v1',
      promptVersion: 'weekly-preparation-prompt-v1',
      smokeVerified: false,
      updatedAt: '2026-07-28T01:00:00Z',
    }))
    const weeklyPreparationAdminRepository: WeeklyPreparationAdminRepository = {
      getSettings: async () => ({
        aiEnabled: false,
        emergencyStop: false,
        modelIdentifier: 'gpt-5-mini',
        corpusVersion: 'weekly-preparation-corpus-v1',
        promptVersion: 'weekly-preparation-prompt-v1',
        smokeVerified: false,
        updatedAt: '2026-07-28T00:00:00Z',
      }),
      updateSettings,
      getLatestEvaluation: async () => ({
        id: '94000000-0000-4000-8000-000000000001',
        status: 'failed',
        accepted: false,
        createdAt: '2026-08-02T00:00:00Z',
        planCount: 30,
        deterministicCount: 0,
        modelCallCount: 30,
        validOutputCount: 29,
        fallbackCount: 1,
        qualityFailureCount: 0,
        reviewedCorrectCount: 29,
        unsupportedCount: 0,
        averageLatencyMs: 100,
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCostAud: 0.1,
        ambiguousDecision: 'fallback',
        acceptanceEligible: false,
        reviewMessage: '29 of 30 cases passed review.',
        failureReasons: [{ reason: 'time_budget_exceeded', count: 1 }],
        failedCases: [
          {
            caseNumber: 4,
            caseKey: 'shared-taco-vegetables-30',
            outcome: 'fallback',
            reason: 'time_budget_exceeded',
            availableMinutes: 30,
            mealNames: ['Beef tacos', 'Bean burritos'],
            generatedTasks: [
              {
                title: 'Prepare taco vegetables',
                estimatedMinutes: 35,
                estimatedTimeSavedMinutes: 20,
              },
            ],
          },
        ],
      }),
      runEvaluation: async () => undefined,
      acceptEvaluation: async () => undefined,
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
      listRecipeEnrichments: async () => [],
      retryRecipeEnrichment: async () => undefined,
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

    const statusTable = await screen.findByRole('table', { name: 'Recipe enrichment status' })
    expect(statusTable).toBeVisible()
    expect(screen.getByRole('rowheader', { name: 'Failed' })).toBeVisible()
    expect(
      screen.getByText(
        'Latest AI error: HTTP 400 · invalid_request_error · text.format.type · Request req_synthetic_diagnostic',
      ),
    ).toBeVisible()

    await user.click(screen.getByText('Technical case evidence'))
    const failedCase = screen.getByText('Case 4: shared taco vegetables 30')
    await user.click(failedCase)
    expect(screen.getByText('Beef tacos, Bean burritos')).toBeVisible()
    expect(screen.getByText(/Prepare taco vegetables/)).toBeVisible()
    expect(
      screen.getByText(
        'The generated tasks require more time than the person said they had available.',
      ),
    ).toBeVisible()

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
