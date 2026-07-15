import type { PostgrestError } from '@supabase/supabase-js'

import type { HouseholdPeopleRepository } from '../../application/households/householdPeopleRepository'
import type { CooksmithSupabaseClient } from '../auth/supabaseAuthClient'

interface InvitationDelivery {
  invitation_token: string
  invited_email: string
}

function databaseError(error: PostgrestError | null): void {
  if (!error) return
  const messages: Record<string, string> = {
    '22023': 'This invitation is no longer valid. Ask the household owner for a new one.',
    '23505': 'That person is already a member or has an active invitation.',
    '42501': 'You do not have permission to make that household change.',
    P0002: 'That household record could not be found.',
  }
  throw new Error(messages[error.code] ?? 'Cooksmith could not update your household. Try again.')
}

function invitationCallback(token: string) {
  const callback = new URL('/auth/confirm', window.location.origin)
  callback.searchParams.set('returnTo', `/invitations/accept?token=${token}`)
  return callback.toString()
}

export function createSupabaseHouseholdPeopleRepository(
  client: CooksmithSupabaseClient,
): HouseholdPeopleRepository {
  const database = client.schema('cooksmith')

  async function deliver(invitation: InvitationDelivery) {
    const { error } = await client.auth.signInWithOtp({
      email: invitation.invited_email,
      options: {
        emailRedirectTo: invitationCallback(invitation.invitation_token),
        shouldCreateUser: true,
      },
    })
    if (error)
      throw new Error(
        'The invitation was saved, but the email could not be sent. Use Resend invitation to try again.',
      )
  }

  return {
    async load(householdId, currentUserId) {
      const [membersResult, invitationsResult] = await Promise.all([
        database.rpc('list_household_members', { p_household_id: householdId }),
        database
          .from('household_invitations')
          .select('id, email, status, expires_at')
          .eq('household_id', householdId)
          .in('status', ['pending', 'expired'])
          .order('created_at', { ascending: false }),
      ])
      databaseError(membersResult.error)
      databaseError(invitationsResult.error)
      const members = (membersResult.data ?? []).map((member) => ({
        id: member.membership_id,
        userId: member.user_id,
        displayName: member.display_name,
        role: member.member_role,
        joinedAt: member.joined_at,
      }))
      const current = members.find((member) => member.userId === currentUserId)
      if (!current) throw new Error('Your active household membership could not be found.')
      return {
        householdId,
        currentUserRole: current.role,
        members,
        invitations: (invitationsResult.data ?? []).map((invitation) => ({
          id: invitation.id,
          email: invitation.email,
          status:
            invitation.status === 'expired' || new Date(invitation.expires_at) <= new Date()
              ? 'expired'
              : 'pending',
          expiresAt: invitation.expires_at,
        })),
      }
    },

    async invite(householdId, email) {
      const result = await database
        .rpc('create_household_invitation', { p_household_id: householdId, p_email: email })
        .single()
      databaseError(result.error)
      if (!result.data) throw new Error('Cooksmith could not create the invitation.')
      await deliver(result.data)
    },

    async resend(invitationId) {
      const result = await database
        .rpc('resend_household_invitation', { p_invitation_id: invitationId })
        .single()
      databaseError(result.error)
      if (!result.data) throw new Error('Cooksmith could not refresh the invitation.')
      await deliver(result.data)
    },

    async cancel(invitationId) {
      const result = await database.rpc('cancel_household_invitation', {
        p_invitation_id: invitationId,
      })
      databaseError(result.error)
    },

    async removeMember(memberId) {
      const result = await database.rpc('remove_household_member', { p_member_id: memberId })
      databaseError(result.error)
    },

    async accept(token, displayName) {
      const result = await database.rpc('accept_household_invitation', {
        p_invitation_token: token,
        p_display_name: displayName,
      })
      databaseError(result.error)
      if (!result.data) throw new Error('Cooksmith could not accept this invitation.')
      return result.data
    },
  }
}
