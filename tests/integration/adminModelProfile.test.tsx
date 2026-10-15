import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  WeeklyPreparationAdminRepository,
  WeeklyPreparationSettings,
} from '../../src/application/admin/weeklyPreparationAdminRepository'
import { renderApp } from '../renderApp'

function setup(aiEnabled = false, failure = false) {
  let settings: WeeklyPreparationSettings = {
    aiEnabled,
    emergencyStop: true,
    modelIdentifier: 'gpt-4.1-mini',
    corpusVersion: 'weekly-preparation-corpus-v13',
    promptVersion: 'weekly-preparation-strategy-v13',
    smokeVerified: true,
    updatedAt: '2026-10-15T00:00:00Z',
  }
  const configureLunaProfile = vi.fn(async () => {
    if (failure) throw new Error('Profile unchanged. Disable both AI features first.')
    settings = {
      ...settings,
      modelIdentifier: 'gpt-6-luna',
      promptVersion: 'weekly-preparation-strategy-v13-luna-low-v1',
      smokeVerified: false,
    }
  })
  const enrichment = {
    paused: true,
    aiEnabled: false,
    dailyRecipeLimit: 100,
    dailyProcessedCount: 0,
    monthlyCostLimitAud: 10,
    recoverableCount: 0,
    terminalUnsupportedCount: 0,
    evaluationReady: true,
    recipesReady: true,
    sources: {
      household: { eligible: 0, current: 0 },
      sharedPlatform: { eligible: 0, current: 0 },
    },
    states: {},
    latestProviderFailure: null,
  }
  const repository: WeeklyPreparationAdminRepository = {
    getSettings: async () => settings,
    updateSettings: vi.fn(async () => settings),
    configureLunaProfile,
    getLatestEvaluation: async () => null,
    runEvaluation: vi.fn(),
    acceptEvaluation: vi.fn(),
    getRecipeEnrichmentStatus: async () => enrichment,
    commandRecipeEnrichment: async () => enrichment,
    setRecipeIntelligenceAi: async () => enrichment,
    setRecipeIntelligenceDailyLimit: async () => enrichment,
    listRecipeEnrichments: async () => [],
    retryRecipeEnrichment: vi.fn(),
  }
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
    { isAdmin: async () => true, list: async () => [], update: vi.fn() },
    undefined,
    repository,
  )
  return repository
}
afterEach(() => vi.restoreAllMocks())
describe('admin model profile transition', () => {
  it('confirms and refreshes the profile without evaluation or activation', async () => {
    const repository = setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare Luna profile' }))
    expect(await screen.findByText(/Luna profile prepared. AI remains disabled/)).toBeVisible()
    expect(screen.getByText('gpt-6-luna')).toBeVisible()
    expect(screen.getByText('Hosted smoke test: Not verified')).toBeVisible()
    expect(repository.configureLunaProfile).toHaveBeenCalledOnce()
    expect(repository.runEvaluation).not.toHaveBeenCalled()
    expect(repository.acceptEvaluation).not.toHaveBeenCalled()
    expect(repository.updateSettings).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Enable AI assistance' })).toBeDisabled()
  })
  it('makes no change when confirmation is cancelled', async () => {
    const repository = setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare Luna profile' }))
    expect(repository.configureLunaProfile).not.toHaveBeenCalled()
  })
  it('shows a failed transition without claiming success', async () => {
    setup(false, true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Prepare Luna profile' }))
    expect(
      await screen.findByText('Profile unchanged. Disable both AI features first.'),
    ).toBeVisible()
    expect(screen.getByText('gpt-4.1-mini')).toBeVisible()
  })
  it('disables profile preparation while weekly AI is enabled', async () => {
    setup(true)
    expect(await screen.findByRole('button', { name: 'Prepare Luna profile' })).toBeDisabled()
  })
})
