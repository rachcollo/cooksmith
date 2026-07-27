import { useCallback, useEffect, useState, type FormEvent } from 'react'

import { useAuth } from '../app/auth/authContext'
import { useHouseholdPeopleRepository } from '../app/households/householdPeopleContext'
import { useOnboarding } from '../app/onboarding/onboardingContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { Stack } from '../components/layout/LayoutPrimitives'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { FeedbackState } from '../components/ui/FeedbackState'
import { LoadingState } from '../components/ui/LoadingState'
import { Panel } from '../components/ui/Panel'
import { TextField } from '../components/ui/TextField'
import {
  invitationEmailSchema,
  type HouseholdMember,
  type HouseholdPeopleState,
} from '../domain/households/invitations'
import { HouseholdPreferencesSection } from './HouseholdPreferencesSection'

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', { dateStyle: 'medium' }).format(new Date(value))
}

export function SettingsPage() {
  const { user } = useAuth()
  const { state: onboarding } = useOnboarding()
  const repository = useHouseholdPeopleRepository()
  const [state, setState] = useState<HouseholdPeopleState | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState('')
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null,
  )
  const [removing, setRemoving] = useState<HouseholdMember | null>(null)

  const load = useCallback(async () => {
    if (!onboarding.householdId || !user) return
    try {
      setState(await repository.load(onboarding.householdId, user.id))
      setLoadError(false)
    } catch {
      setLoadError(true)
    }
  }, [onboarding.householdId, repository, user])

  useEffect(() => {
    let active = true
    if (onboarding.householdId && user) {
      void repository
        .load(onboarding.householdId, user.id)
        .then((next) => {
          if (active) setState(next)
        })
        .catch(() => {
          if (active) setLoadError(true)
        })
    }
    return () => {
      active = false
    }
  }, [onboarding.householdId, repository, user])

  async function run(key: string, work: () => Promise<void>, success: string) {
    setBusy(key)
    setFeedback(null)
    try {
      await work()
      setFeedback({ tone: 'success', message: success })
      await load()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setBusy('')
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault()
    if (!state) return
    const result = invitationEmailSchema.safeParse(email)
    if (!result.success) {
      setFeedback({ tone: 'error', message: result.error.issues[0]?.message ?? 'Check the email.' })
      return
    }
    await run(
      'invite',
      async () => repository.invite(state.householdId, result.data),
      'Invitation sent.',
    )
    setEmail('')
  }

  if (loadError)
    return (
      <ErrorState
        title="We couldn’t load your household"
        message="Your household is safe. Try loading the member list again."
        actionLabel="Try again"
        onAction={() => void load()}
      />
    )
  if (!state) return <LoadingState label="Loading household members" />

  const owner = state.currentUserRole === 'owner'
  const removable = removing && removing.userId !== user?.id

  return (
    <Stack gap="large">
      <DocumentTitle title="Household settings" />
      <PageHeader
        eyebrow="Settings"
        title="Household members"
        description="Keep the people sharing Cooksmith together in one household."
        status={<Badge tone={owner ? 'positive' : 'neutral'}>{owner ? 'Owner' : 'Member'}</Badge>}
      />

      {feedback ? (
        <FeedbackState
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Done' : 'We couldn’t do that'}
          message={feedback.message}
        />
      ) : null}

      {owner ? (
        <Panel className="people-section">
          <h2>Invite someone</h2>
          <p>They’ll receive a secure, one-time Cooksmith sign-in link valid for seven days.</p>
          <form className="invite-form" onSubmit={(event) => void invite(event)}>
            <TextField
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Button type="submit" busy={busy === 'invite'} busyLabel="Sending invitation">
              Send invitation
            </Button>
          </form>
        </Panel>
      ) : null}

      <section className="people-section" aria-labelledby="members-heading">
        <h2 id="members-heading">Members</h2>
        <div className="people-list">
          {state.members.map((member) => (
            <article className="person-row" key={member.id}>
              <div>
                <h3>{member.displayName}</h3>
                <p>
                  Joined {friendlyDate(member.joinedAt)}
                  {member.userId === user?.id ? ' · You' : ''}
                </p>
              </div>
              <div className="person-actions">
                <Badge tone={member.role === 'owner' ? 'positive' : 'neutral'}>{member.role}</Badge>
                {owner && member.userId !== user?.id ? (
                  <Button variant="quiet" onClick={() => setRemoving(member)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {owner ? (
        <section className="people-section" aria-labelledby="invitations-heading">
          <h2 id="invitations-heading">Pending invitations</h2>
          {state.invitations.length ? (
            <div className="people-list">
              {state.invitations.map((invitation) => (
                <article className="person-row" key={invitation.id}>
                  <div>
                    <h3>{invitation.email}</h3>
                    <p>
                      {invitation.status === 'expired'
                        ? 'Expired'
                        : `Expires ${friendlyDate(invitation.expiresAt)}`}
                    </p>
                  </div>
                  <div className="person-actions">
                    <Button
                      variant="secondary"
                      busy={busy === `resend-${invitation.id}`}
                      onClick={() =>
                        void run(
                          `resend-${invitation.id}`,
                          () => repository.resend(invitation.id),
                          'Invitation resent.',
                        )
                      }
                    >
                      Resend
                    </Button>
                    <Button
                      variant="quiet"
                      busy={busy === `cancel-${invitation.id}`}
                      onClick={() =>
                        void run(
                          `cancel-${invitation.id}`,
                          () => repository.cancel(invitation.id),
                          'Invitation cancelled.',
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No invitations waiting"
              message="Invite someone when you’re ready to share Cooksmith."
            />
          )}
        </section>
      ) : null}

      <HouseholdPreferencesSection householdId={state.householdId} />

      <Dialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove household member?"
        description={
          removing
            ? `${removing.displayName} will immediately lose access to this household.`
            : undefined
        }
      >
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setRemoving(null)}>
            Keep member
          </Button>
          <Button
            disabled={!removable}
            busy={busy === 'remove'}
            busyLabel="Removing member"
            onClick={() => {
              if (!removing) return
              void run(
                'remove',
                () => repository.removeMember(removing.id),
                'Member removed.',
              ).then(() => setRemoving(null))
            }}
          >
            Remove member
          </Button>
        </div>
      </Dialog>
    </Stack>
  )
}
