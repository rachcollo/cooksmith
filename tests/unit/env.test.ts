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
})
