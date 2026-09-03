import { describe, expect, it } from 'vitest'

import { supportsNodeVersion } from '../../scripts/tool-version-support.mjs'

describe('Node version support', () => {
  it.each(['24.14.0', '24.19.0', '24.14.1', '24.19.0+build.1'])(
    'accepts supported version %s',
    (version) => {
      expect(supportsNodeVersion(version)).toBe(true)
    },
  )

  it.each(['24.13.9', '23.99.0', '25.0.0', 'invalid', ''])(
    'rejects unsupported version %s',
    (version) => {
      expect(supportsNodeVersion(version)).toBe(false)
    },
  )
})
