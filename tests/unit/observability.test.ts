import { describe, expect, it, vi } from 'vitest'

import type { PublicEnv } from '../../src/config/env'
import {
  initObservability,
  sanitisePosthogProperties,
  scrubSentryEvent,
  scrubUrl,
  shouldActivate,
} from '../../src/infrastructure/observability/observability'

const productionEnv: PublicEnv = {
  appEnvironment: 'production',
  buildCommit: 'abc123',
  observability: { sentryDsn: 'https://public@o1.ingest.sentry.io/2' },
  analytics: { posthogKey: 'phc_synthetic', posthogHost: 'https://eu.i.posthog.com' },
}

describe('shouldActivate', () => {
  it('is off in test mode even in production', () => {
    expect(shouldActivate(productionEnv, 'test')).toBe(false)
  })

  it('is off in development and preview-mode aside', () => {
    expect(shouldActivate({ appEnvironment: 'development' }, 'production')).toBe(false)
  })

  it('is on for preview and production outside test mode', () => {
    expect(shouldActivate({ appEnvironment: 'preview' }, 'production')).toBe(true)
    expect(shouldActivate({ appEnvironment: 'production' }, 'production')).toBe(true)
  })
})

describe('scrubUrl', () => {
  it('drops the query string and fragment', () => {
    expect(scrubUrl('https://app.example.com/welcome?returnTo=%2F&code=secret#x')).toBe(
      'https://app.example.com/welcome',
    )
  })

  it('returns undefined for non-string or empty input', () => {
    expect(scrubUrl(undefined)).toBeUndefined()
    expect(scrubUrl('')).toBeUndefined()
  })
})

describe('scrubSentryEvent', () => {
  it('removes cookies, scrubs the URL and drops user identity', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://app.example.com/recipes?token=abc',
        cookies: 'session=xyz',
        headers: { Authorization: 'Bearer x', 'Content-Type': 'application/json' },
        query_string: 'token=abc',
      },
      user: { email: 'person@example.com', id: 'u1' },
      extra: { email: 'person@example.com', page: 'recipes' },
    })

    const request = event.request as Record<string, unknown>
    expect(request.url).toBe('https://app.example.com/recipes')
    expect(request.cookies).toBeUndefined()
    expect(request.query_string).toBeUndefined()
    expect(request.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(event.user).toBeUndefined()
    expect(event.extra).toEqual({ page: 'recipes' })
  })
})

describe('sanitisePosthogProperties', () => {
  it('strips query strings from urls and removes personal values', () => {
    const result = sanitisePosthogProperties({
      $current_url: 'https://app.example.com/plan?household=Smith',
      $pathname: 'https://app.example.com/plan?x=1',
      email: 'person@example.com',
      contact: 'person@example.com',
      keep: 'ok',
    })

    expect(result.$current_url).toBe('https://app.example.com/plan')
    expect(result.$pathname).toBe('https://app.example.com/plan')
    expect(result.email).toBeUndefined()
    expect(result.contact).toBeUndefined()
    expect(result.keep).toBe('ok')
  })
})

describe('initObservability', () => {
  it('does nothing in test mode', () => {
    const sentry = { init: vi.fn() }
    const posthog = { init: vi.fn() }

    const result = initObservability(productionEnv, { mode: 'test', sentry, posthog })

    expect(result).toEqual({ analytics: false, sentry: false })
    expect(sentry.init).not.toHaveBeenCalled()
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('does nothing when configuration is absent', () => {
    const sentry = { init: vi.fn() }
    const posthog = { init: vi.fn() }

    const result = initObservability(
      { appEnvironment: 'production' },
      {
        mode: 'production',
        sentry,
        posthog,
      },
    )

    expect(result).toEqual({ analytics: false, sentry: false })
    expect(sentry.init).not.toHaveBeenCalled()
    expect(posthog.init).not.toHaveBeenCalled()
  })

  it('initialises Sentry with privacy options and no replay integration', () => {
    const sentry = { init: vi.fn() }
    const posthog = { init: vi.fn() }

    initObservability(productionEnv, { mode: 'production', sentry, posthog })

    expect(sentry.init).toHaveBeenCalledTimes(1)
    const options = sentry.init.mock.calls[0][0]
    expect(options.environment).toBe('production')
    expect(options.release).toBe('abc123')
    expect(options.sendDefaultPii).toBe(false)
    expect(options.tracesSampleRate).toBe(0)
    expect(options.beforeSend).toBe(scrubSentryEvent)
    expect(options.integrations).toBeUndefined()
  })

  it('initialises PostHog with recording off, no autocapture and identified-only profiles', () => {
    const sentry = { init: vi.fn() }
    const posthog = { init: vi.fn() }

    initObservability(productionEnv, { mode: 'production', sentry, posthog })

    expect(posthog.init).toHaveBeenCalledTimes(1)
    const [token, config] = posthog.init.mock.calls[0]
    expect(token).toBe('phc_synthetic')
    expect(config.api_host).toBe('https://eu.i.posthog.com')
    expect(config.autocapture).toBe(false)
    expect(config.disable_session_recording).toBe(true)
    expect(config.person_profiles).toBe('identified_only')
    expect(config.property_denylist).toContain('$ip')
    expect(config.sanitize_properties).toBe(sanitisePosthogProperties)
  })
})
