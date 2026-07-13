import { describe, expect, it } from 'vitest'

import { parsePublicEnv } from '../../src/config/env'

describe('public environment configuration', () => {
  it('uses safe local defaults when optional values are absent', () => {
    expect(parsePublicEnv({})).toEqual({ appEnvironment: 'development' })
  })

  it('accepts a preview environment and trims the build reference', () => {
    expect(parsePublicEnv({ VITE_APP_ENV: 'preview', VITE_BUILD_COMMIT: ' abc123 ' })).toEqual({
      appEnvironment: 'preview',
      buildCommit: 'abc123',
    })
  })

  it('fails clearly for an unsupported environment', () => {
    expect(() => parsePublicEnv({ VITE_APP_ENV: 'staging' })).toThrow('VITE_APP_ENV must be one of')
  })
})
