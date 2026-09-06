import type { AuthBootstrapErrorCategory } from '../../application/auth/bootstrapAuth'
import { recordAuthEvent } from '../../application/auth/authTelemetry'
import { ErrorState } from '../../components/ui/ErrorState'

interface AuthCallbackErrorProps {
  category: AuthBootstrapErrorCategory
}

export function AuthCallbackError({ category }: AuthCallbackErrorProps) {
  const recoveryFailed =
    category === 'recovery_link_invalid' || category === 'recovery_session_failed'
  const sessionFailed = category === 'email_session_failed' || category === 'pkce_exchange_failed'
  const title = recoveryFailed
    ? 'This password reset link can’t be used'
    : sessionFailed
      ? 'Please sign in to continue'
      : 'This email link can’t be used'
  const message = recoveryFailed
    ? 'The link may have expired or already been used. Send a new password reset email to try again.'
    : sessionFailed
      ? 'Your email may already be confirmed, but we could not safely sign you in. Please return to sign in.'
      : 'The link may have expired or already been used. Send a fresh email to continue.'
  const actionLabel = recoveryFailed
    ? 'Send a new reset email'
    : sessionFailed
      ? 'Return to sign in'
      : 'Send a new email'
  return (
    <main className="container page-content">
      <ErrorState
        title={title}
        message={message}
        actionLabel={actionLabel}
        onAction={() => {
          recordAuthEvent({
            name: 'auth_recovery',
            outcome: recoveryFailed || !sessionFailed ? 'fresh_email' : 'password_sign_in',
          })
          window.location.replace(
            recoveryFailed
              ? '/auth/forgot-password'
              : sessionFailed
                ? '/auth/sign-in'
                : '/auth/magic-link',
          )
        }}
      />
    </main>
  )
}
