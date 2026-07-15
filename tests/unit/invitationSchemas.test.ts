import { describe, expect, it } from 'vitest'

import {
  invitationEmailSchema,
  invitationTokenSchema,
  invitedMemberProfileSchema,
} from '../../src/domain/households/invitations'

describe('household invitation validation', () => {
  it('normalises a valid invitation email and rejects malformed input', () => {
    expect(invitationEmailSchema.parse('  member@example.test ')).toBe('member@example.test')
    expect(invitationEmailSchema.safeParse('not-an-email').success).toBe(false)
  })

  it('accepts only a full random invitation token', () => {
    expect(invitationTokenSchema.safeParse('a'.repeat(64)).success).toBe(true)
    expect(invitationTokenSchema.safeParse('short').success).toBe(false)
  })

  it('requires a useful member display name', () => {
    expect(invitedMemberProfileSchema.parse({ displayName: '  Alex ' }).displayName).toBe('Alex')
    expect(invitedMemberProfileSchema.safeParse({ displayName: ' ' }).success).toBe(false)
  })
})
