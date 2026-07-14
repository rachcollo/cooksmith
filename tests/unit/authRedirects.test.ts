import { describe, expect, it } from 'vitest'

import { authRedirectUrl, safeReturnPath } from '../../src/application/auth/redirects'

describe('authentication redirects', () => {
  it('accepts same-app paths and rejects external or protocol-relative destinations', () => {
    expect(safeReturnPath('/recipes?from=auth')).toBe('/recipes?from=auth')
    expect(safeReturnPath('//evil.example')).toBe('/')
    expect(safeReturnPath('https://evil.example')).toBe('/')
  })

  it('only builds approved callback URLs', () => {
    expect(authRedirectUrl('/auth/confirm', 'https://cooksmith.example')).toBe(
      'https://cooksmith.example/auth/confirm',
    )
    expect(() => authRedirectUrl('/admin', 'https://cooksmith.example')).toThrow('Unsupported')
  })
})
