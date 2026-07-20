import { describe, expect, it } from 'vitest'

import { parsePublicEnv, validateBuildEnv } from '../../src/config/env'

describe('public environment configuration', () => {
  it('uses safe local defaults when optional values are absent', () => {
    expect(parsePublicEnv({})).toEqual({ appEnvironment: 'development' })
  })

  it('accepts paired local Supabase values and trims the build reference', () => {
    expect(
      parsePublicEnv({
        VITE_APP_ENV: 'development',
        VITE_BUILD_COMMIT: ' abc123 ',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321/',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-local-publishable-key',
      }),
    ).toEqual({
      appEnvironment: 'development',
      buildCommit: 'abc123',
      supabase: {
        url: 'http://127.0.0.1:54321',
        publishableKey: 'synthetic-local-publishable-key',
      },
    })
  })

  it('fails clearly for an unsupported environment', () => {
    expect(() => parsePublicEnv({ VITE_APP_ENV: 'staging' })).toThrow('VITE_APP_ENV must be one of')
  })

  it('rejects partial Supabase public configuration', () => {
    expect(() => parsePublicEnv({ VITE_SUPABASE_URL: 'http://127.0.0.1:54321' })).toThrow(
      'must be configured together',
    )
  })

  it('requires Supabase configuration for preview builds', () => {
    expect(() => parsePublicEnv({ VITE_APP_ENV: 'preview' })).toThrow(
      'Supabase public configuration is required',
    )
  })

  it('omits observability and analytics when their values are absent', () => {
    const config = parsePublicEnv({ VITE_APP_ENV: 'development' })
    expect(config.observability).toBeUndefined()
    expect(config.analytics).toBeUndefined()
  })

  it('reads Sentry and PostHog configuration when present, defaulting the EU host', () => {
    const config = parsePublicEnv({
      VITE_APP_ENV: 'development',
      VITE_SENTRY_DSN: ' https://public@o1.ingest.sentry.io/2 ',
      VITE_POSTHOG_KEY: ' phc_synthetic ',
    })
    expect(config.observability).toEqual({ sentryDsn: 'https://public@o1.ingest.sentry.io/2' })
    expect(config.analytics).toEqual({
      posthogKey: 'phc_synthetic',
      posthogHost: 'https://eu.i.posthog.com',
    })
  })

  it('honours an explicit PostHog host', () => {
    const config = parsePublicEnv({
      VITE_APP_ENV: 'development',
      VITE_POSTHOG_KEY: 'phc_synthetic',
      VITE_POSTHOG_HOST: 'https://us.i.posthog.com',
    })
    expect(config.analytics?.posthogHost).toBe('https://us.i.posthog.com')
  })
})

describe('preview-to-production safety', () => {
  const previewSource = {
    VERCEL_ENV: 'preview',
    VITE_APP_ENV: 'preview',
    VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-staging-publishable-key',
  }

  it('allows a hosted staging project when the production deny-list differs', () => {
    expect(
      validateBuildEnv({
        ...previewSource,
        COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS: 'zyxwvutsrqponmlkjihg',
      }).appEnvironment,
    ).toBe('preview')
  })

  it('fails closed when preview uses a denied production project reference', () => {
    expect(() =>
      validateBuildEnv({
        ...previewSource,
        COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS: 'abcdefghijklmnopqrst',
      }),
    ).toThrow('denied production project')
  })

  it('requires the server-only production deny-list for preview builds', () => {
    expect(() => validateBuildEnv(previewSource)).toThrow(
      'COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS is required',
    )
  })

  it('rejects a Vercel preview that is labelled as development', () => {
    expect(() => validateBuildEnv({ ...previewSource, VITE_APP_ENV: 'development' })).toThrow(
      'VITE_APP_ENV must be preview',
    )
  })

  it('uses Vercel production as the trusted environment when the public label is absent', () => {
    expect(
      validateBuildEnv({
        VERCEL_ENV: 'production',
        VITE_SUPABASE_URL: 'https://zyxwvutsrqponmlkjihg.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-production-publishable-key',
      }).appEnvironment,
    ).toBe('production')
  })

  it('still rejects an explicit environment mismatch', () => {
    expect(() =>
      validateBuildEnv({
        VERCEL_ENV: 'production',
        VITE_APP_ENV: 'preview',
        VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-staging-publishable-key',
      }),
    ).toThrow('VITE_APP_ENV must be production')
  })
})
