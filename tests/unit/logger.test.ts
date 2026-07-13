import { describe, expect, it } from 'vitest'

import { loggingInternals } from '../../src/infrastructure/logging/logger'

describe('structured logging', () => {
  it('removes sensitive fields before a log payload is written', () => {
    expect(
      loggingInternals.sanitise({
        correlationId: 'request-1',
        email: 'person@example.com',
        accessToken: 'do-not-log',
        status: 500,
      }),
    ).toEqual({ correlationId: 'request-1', status: 500 })
  })
})
