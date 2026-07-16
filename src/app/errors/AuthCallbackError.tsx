import type { AuthBootstrapErrorCategory } from '../../application/auth/bootstrapAuth'
import { ErrorState } from '../../components/ui/ErrorState'

interface AuthCallbackErrorProps {
  category: AuthBootstrapErrorCategory
}

export function AuthCallbackError({ category }: AuthCallbackErrorProps) {
  return (
    <main className="container page-content">
      <ErrorState
        title="Sign-in link could not be completed"
        message={`Please request a new magic link and open it in the same browser you used to request it. Reference: ${category}.`}
        actionLabel="Request a new magic link"
        onAction={() => window.location.assign('/auth/magic-link')}
      />
    </main>
  )
}
