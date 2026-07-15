import type { HouseholdPeopleState } from '../../domain/households/invitations'

export interface HouseholdPeopleRepository {
  load(householdId: string, currentUserId: string): Promise<HouseholdPeopleState>
  invite(householdId: string, email: string): Promise<void>
  resend(invitationId: string): Promise<void>
  cancel(invitationId: string): Promise<void>
  removeMember(memberId: string): Promise<void>
  accept(token: string, displayName: string): Promise<string>
}
