import { ErrorState } from '../../components/ui/ErrorState'
import { isAuthBootstrapError } from '../../application/auth/bootstrapAuth'

interface AuthCallbackErrorProps {
  error: unknown
}

export function AuthCallbackError({ error }: AuthCallbackErrorProps) {
  const reference = isAuthBootstrapError(error) ? error.category : 'auth_callback_failed'

  return (
    <main className="container page-content">
      <ErrorState
        title="That sign-in link could not be completed"
        message="Please request a new magic link and open it in the same browser. Nothing has been changed."
        actionLabel="Request a new magic link"
        href="/auth/magic-link"
        reference={reference}
      />
    </main>
  )
}
