import { z } from 'zod'

export const invitationEmailSchema = z
  .string()
  .trim()
  .email('Enter a valid email address.')
  .max(254, 'Email must be 254 characters or fewer.')

export const invitationTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, 'This invitation link is invalid.')

export const invitedMemberProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Enter the name you would like your household to see.')
    .max(100, 'Display name must be 100 characters or fewer.'),
})

export interface HouseholdMember {
  id: string
  userId: string
  displayName: string
  role: 'owner' | 'member'
  joinedAt: string
}

export interface HouseholdInvitation {
  id: string
  email: string
  status: 'pending' | 'expired'
  expiresAt: string
}

export interface HouseholdPeopleState {
  householdId: string
  currentUserRole: 'owner' | 'member'
  members: HouseholdMember[]
  invitations: HouseholdInvitation[]
}
