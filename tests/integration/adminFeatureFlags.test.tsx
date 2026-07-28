import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { FeatureFlagRepository } from '../../src/application/admin/featureFlagRepository'
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
})
