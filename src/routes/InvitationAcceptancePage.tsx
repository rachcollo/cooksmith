import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { useHouseholdPeopleRepository } from '../app/households/householdPeopleContext'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { Button } from '../components/ui/Button'
import { FeedbackState } from '../components/ui/FeedbackState'
import { TextField } from '../components/ui/TextField'
import { invitationTokenSchema, invitedMemberProfileSchema } from '../domain/households/invitations'

export function InvitationAcceptancePage() {
  const repository = useHouseholdPeopleRepository()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const token = invitationTokenSchema.safeParse(params.get('token'))

  if (!token.success) return <Navigate replace to="/" />
  const invitationToken = token.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    const profile = invitedMemberProfileSchema.safeParse({ displayName })
    if (!profile.success) {
      setError(profile.error.issues[0]?.message ?? 'Check your display name.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await repository.accept(invitationToken, profile.data.displayName)
      navigate('/', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Please ask for a new invitation.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="onboarding-shell" id="main-content">
      <DocumentTitle title="Join household" />
      <a className="brand" href="/invitations/accept">
        <span className="brand-mark" aria-hidden="true">
          C
        </span>
        <strong>Cooksmith</strong>
      </a>
      <section className="onboarding-card invitation-card" aria-labelledby="invitation-title">
        <h1 id="invitation-title">Join your Cooksmith household</h1>
        <p>Choose the name the other household members will see.</p>
        {error ? (
          <FeedbackState tone="error" title="We couldn’t accept that invitation" message={error} />
        ) : null}
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
      </section>
    </main>
  )
}
