import { describe, expect, it } from 'vitest'

import {
  authRedirectUrl,
  emailAuthRedirectUrl,
  safeReturnPath,
} from '../../src/application/auth/redirects'

describe('authentication redirects', () => {
  it('accepts same-app paths and rejects external or protocol-relative destinations', () => {
    expect(safeReturnPath('/recipes?from=auth')).toBe('/recipes?from=auth')
    expect(safeReturnPath('//evil.example')).toBe('/')
    expect(safeReturnPath('https://evil.example')).toBe('/')
    expect(safeReturnPath('/\\evil.example')).toBe('/')
    expect(safeReturnPath('https%3A%2F%2Fevil.example')).toBe('/')
  })

  it('only builds approved callback URLs', () => {
    expect(authRedirectUrl('/auth/confirm', 'https://cooksmith.example')).toBe(
      'https://cooksmith.example/auth/confirm',
    )
    expect(() => authRedirectUrl('/admin', 'https://cooksmith.example')).toThrow('Unsupported')
  })

  it('always gives email templates a query parameter to safely append token data', () => {
    expect(emailAuthRedirectUrl('/recipes', 'https://cooksmith.example')).toBe(
      'https://cooksmith.example/auth/confirm?returnTo=%2Frecipes',
    )
    expect(emailAuthRedirectUrl('//evil.example', 'https://cooksmith.example')).toBe(
      'https://cooksmith.example/auth/confirm?returnTo=%2F',
    )
  })
})
