import type { AuthBootstrapErrorCategory } from '../../application/auth/bootstrapAuth'
import { recordAuthEvent } from '../../application/auth/authTelemetry'
import { ErrorState } from '../../components/ui/ErrorState'

interface AuthCallbackErrorProps {
  category: AuthBootstrapErrorCategory
}

export function AuthCallbackError({ category }: AuthCallbackErrorProps) {
  const sessionFailed = category === 'email_session_failed' || category === 'pkce_exchange_failed'
  return (
    <main className="container page-content">
      <ErrorState
        title={sessionFailed ? 'Please sign in to continue' : 'This email link can’t be used'}
        message={
          sessionFailed
            ? 'Your email may already be confirmed, but we could not safely sign you in. Please return to sign in.'
            : 'The link may have expired or already been used. Send a fresh email to continue.'
        }
        actionLabel={sessionFailed ? 'Return to sign in' : 'Send a new email'}
        onAction={() => {
          recordAuthEvent({
            name: 'auth_recovery',
            outcome: sessionFailed ? 'password_sign_in' : 'fresh_email',
          })
          window.location.replace(sessionFailed ? '/auth/sign-in' : '/auth/magic-link')
        }}
      />
    </main>
  )
}
