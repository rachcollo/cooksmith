import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WeeklyPreparationAdminRepositoryContext } from '../../src/app/admin/weeklyPreparationAdminContext'
import type {
  RecipeRepairInspection,
  WeeklyPreparationAdminRepository,
} from '../../src/application/admin/weeklyPreparationAdminRepository'
import { AdminRecipesPage } from '../../src/routes/AdminRecipesPage'

const initial: RecipeRepairInspection = {
  rulesVersion: 'cooksmith-rules-v4',
  currentRules: false,
  enabled: true,
  failureCategory: 'schema_invalid',
  repair: null,
}
function setup(state = initial) {
  const inspectRecipeRepair = vi.fn(async () => state)
  const prepareRecipeRepair = vi.fn(async () => 'job-1')
  const runRecipeRepair = vi.fn(async () => {
    state = {
      ...state,
      currentRules: true,
      failureCategory: null,
      repair: {
        jobId: 'job-1',
        state: 'completed',
        failureCategory: null,
        estimatedCostAud: 0.001234,
        providerStarted: true,
        createdAt: '2026-10-15T00:00:00Z',
        leaseExpired: false,
      },
    }
  })
  const repository = {
    listRecipeEnrichments: vi.fn(async () => [
      {
        recipeId: 'recipe-1',
        sourceKind: 'shared_platform',
        name: 'Vegetable soup',
        ownerLabel: 'Shared platform recipe',
        updatedAt: '2026-10-15T00:00:00Z',
        status: 'failed',
        completedAt: null,
        aiActive: false,
        retryable: true,
        canEdit: false,
      },
    ]),
    inspectRecipeRepair,
    prepareRecipeRepair,
    runRecipeRepair,
  } as unknown as WeeklyPreparationAdminRepository
  render(
    <MemoryRouter>
      <WeeklyPreparationAdminRepositoryContext value={repository}>
        <AdminRecipesPage />
      </WeeklyPreparationAdminRepositoryContext>
    </MemoryRouter>,
  )
  return { inspectRecipeRepair, prepareRecipeRepair, runRecipeRepair }
}
afterEach(() => vi.restoreAllMocks())
describe('one selected recipe repair', () => {
  it('inspects, confirms only the selected source and retains outcome/cost', async () => {
    const calls = setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    expect(await screen.findByText(/AI output did not pass validation/)).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Vegetable soup' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Repair this recipe' }))
    expect(await screen.findByText('Estimated cost: A$0.001234')).toBeVisible()
    expect(calls.prepareRecipeRepair).toHaveBeenCalledWith(
      'recipe-1',
      'shared_platform',
      expect.any(String),
    )
    expect(calls.runRecipeRepair).toHaveBeenCalledExactlyOnceWith('job-1')
    expect(screen.getByText(/Review the recorded outcome/)).toBeVisible()
  })
  it('keeps refresh available after an inspection failure', async () => {
    const calls = setup()
    calls.inspectRecipeRepair.mockRejectedValueOnce(new Error('unavailable'))
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Refresh result' }))
    expect(await screen.findByRole('button', { name: 'Repair this recipe' })).toBeEnabled()
    expect(calls.runRecipeRepair).not.toHaveBeenCalled()
  })
  it('does not spend when confirmation is declined', async () => {
    const calls = setup()
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Repair this recipe' }))
    expect(calls.prepareRecipeRepair).not.toHaveBeenCalled()
    expect(calls.runRecipeRepair).not.toHaveBeenCalled()
  })
  it('leaves paused settings unchanged', async () => {
    setup({ ...initial, enabled: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    expect(await screen.findByRole('button', { name: 'Repair this recipe' })).toBeDisabled()
    expect(screen.getByText(/Repair is paused/)).toBeVisible()
  })
  it('blocks another attempt when cost is missing', async () => {
    setup({
      ...initial,
      repair: {
        jobId: 'job-1',
        state: 'failed',
        failureCategory: 'timeout',
        estimatedCostAud: null,
        providerStarted: true,
        createdAt: '2026-10-15T00:00:00Z',
        leaseExpired: false,
      },
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    expect(await screen.findByText(/Estimated cost: Unavailable/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Repair this recipe' })).toBeDisabled()
  })
  it('refreshes a lost response without dispatching a second job', async () => {
    const calls = setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    calls.runRecipeRepair.mockRejectedValueOnce(
      new Error('Repair response unavailable. Refresh the result.'),
    )
    await userEvent.click(await screen.findByRole('button', { name: 'Inspect Vegetable soup' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Repair this recipe' }))
    expect(
      await screen.findByText('Repair response unavailable. Refresh the result.'),
    ).toBeVisible()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Refresh result' })).toBeEnabled(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Refresh result' }))
    expect(calls.runRecipeRepair).toHaveBeenCalledTimes(1)
  })
})
