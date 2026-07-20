import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  captureError,
  initObservability,
  setObservabilityBackend,
  track,
  trackPageView,
  type ObservabilityBackend,
} from '../../src/infrastructure/observability/observability'

afterEach(() => {
  setObservabilityBackend(null)
})

describe('observability', () => {
  it('does nothing when no backend is configured', () => {
    expect(() => {
      captureError(new Error('boom'), { correlationId: 'abc' })
      track('recipe_created')
      trackPageView('/recipes')
    }).not.toThrow()
  })

  it('forwards events, pageviews and errors to the installed backend', () => {
    const backend: ObservabilityBackend = {
      captureError: vi.fn(),
      track: vi.fn(),
      trackPageView: vi.fn(),
    }
    setObservabilityBackend(backend)

    const failure = new Error('boom')
    captureError(failure, { correlationId: 'abc' })
    track('shopping_list_generated', { itemCount: 3 })
    trackPageView('/shopping')

    expect(backend.captureError).toHaveBeenCalledWith(failure, { correlationId: 'abc' })
    expect(backend.track).toHaveBeenCalledWith('shopping_list_generated', { itemCount: 3 })
    expect(backend.trackPageView).toHaveBeenCalledWith('/shopping')
  })

  it('leaves the no-op backend in place when neither provider is configured', async () => {
    await initObservability({ appEnvironment: 'test' })
    expect(() => track('meal_planned')).not.toThrow()
  })
})
