import { useContext, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../app/auth/authContext'
import { HouseholdPeopleRepositoryContext } from '../app/households/householdPeopleContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { FeedbackState } from '../components/ui/FeedbackState'
import { TextField } from '../components/ui/TextField'
import { invitationTokenSchema, invitedMemberProfileSchema } from '../domain/households/invitations'

const pendingKey = 'cooksmith.pending-invitation.v1'

function readPendingInvitation() {
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null')
    if (
      !saved ||
      typeof saved !== 'object' ||
      !('expiresAt' in saved) ||
      typeof saved.expiresAt !== 'number' ||
      saved.expiresAt <= Date.now() ||
      !('token' in saved)
    )
      return ''
    return invitationTokenSchema.safeParse(saved.token).data ?? ''
  } catch {
    return ''
  }
}

export function InvitationAcceptancePage() {
  const auth = useAuth()
  const repository = useContext(HouseholdPeopleRepositoryContext)
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState(() =>
    params.has('token')
      ? (invitationTokenSchema.safeParse(params.get('token')).data ?? '')
      : readPendingInvitation(),
  )

  const incomingToken = params.has('token')
    ? (invitationTokenSchema.safeParse(params.get('token')).data ?? '')
    : null
  if (incomingToken !== null && incomingToken !== token) setToken(incomingToken)

  useEffect(() => {
    // Tab-scoped continuation keeps bearer tokens out of auth redirects, telemetry and history.
    try {
      if (token)
        sessionStorage.setItem(
          pendingKey,
          JSON.stringify({ token, expiresAt: Date.now() + 7 * 86400000 }),
        )
      else sessionStorage.removeItem(pendingKey)
    } catch {
      /* Acceptance still works in this page; auth continuation requires tab storage. */
    }
    if (params.has('token')) void navigate('/invitations/accept', { replace: true })
  }, [navigate, params, token])

  function startAcceptance() {
    try {
      sessionStorage.setItem(
        pendingKey,
        JSON.stringify({ token, expiresAt: Date.now() + 7 * 86400000 }),
      )
      void navigate('/welcome?returnTo=%2Finvitations%2Faccept')
    } catch {
      setError('Allow session storage in this browser, then accept the invitation again.')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !auth.user) return
    if (!repository) {
      setError('Household invitations are not configured. Try again later.')
      return
    }
    const profile = invitedMemberProfileSchema.safeParse({ displayName })
    if (!profile.success) {
      setError(profile.error.issues[0]?.message ?? 'Check your display name.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await repository.accept(token, profile.data.displayName)
      try {
        sessionStorage.removeItem(pendingKey)
      } catch {
        /* Membership is accepted even if tab storage was disabled. */
      }
      void navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please ask for a new invitation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell" id="main-content">
      <DocumentTitle title="Join household" />
      <Link className="brand" to="/welcome">
        <span className="brand-mark" aria-hidden="true">
          C
        </span>
        <strong>Cooksmith</strong>
      </Link>
      <section className="onboarding-card invitation-card" aria-labelledby="invitation-title">
        <h1 id="invitation-title">Join your Cooksmith household</h1>
        {error ? (
          <FeedbackState tone="error" title="We couldn’t accept that invitation" message={error} />
        ) : null}
        {!token ? (
          <FeedbackState
            tone="info"
            title="Open your invitation email"
            message="Use the latest invitation link. If it has expired or been cancelled, ask the household owner for a new invitation."
          />
        ) : auth.loading ? (
          <p role="status">Checking your session…</p>
        ) : !auth.user ? (
          <>
            <p>
              No account has been created for you. Accept to sign in with the invited email address,
              or choose to create and verify an account.
            </p>
            <Button onClick={startAcceptance}>Accept invitation</Button>
          </>
        ) : (
          <>
            <p>
              Use the account with the email address that received this invitation. Choose the name
              the household will see.
            </p>
            <form className="auth-form" onSubmit={(event) => void submit(event)}>
              <TextField
                label="Display name"
                required
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              <Button type="submit" busy={busy} busyLabel="Joining household">
                Join household
              </Button>
            </form>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void auth.signOut().catch(() => setError('We could not sign you out. Try again.'))
              }
            >
              Use a different account
            </Button>
          </>
        )}
      </section>
    </main>
  )
}
