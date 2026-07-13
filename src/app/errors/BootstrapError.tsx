import { ErrorState } from '../../components/ui/ErrorState'

interface BootstrapErrorProps {
  error: unknown
}

export function BootstrapError({ error }: BootstrapErrorProps) {
  const message = error instanceof Error ? error.message : 'Configuration could not be loaded.'

  return (
    <main className="container page-content">
      <ErrorState
        title="Cooksmith is not configured"
        message={message}
        actionLabel="Try again"
        onAction={() => window.location.reload()}
      />
    </main>
  )
}
