import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorState } from '../../components/ui/ErrorState'
import { logger } from '../../infrastructure/logging/logger'
import { createCorrelationId } from '../../shared/utils/createCorrelationId'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  correlationId?: string
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public override componentDidCatch(error: Error, info: ErrorInfo) {
    const correlationId = createCorrelationId()

    logger.error('application_render_failed', {
      correlationId,
      errorName: error.name,
      componentStackAvailable: Boolean(info.componentStack),
    })

    this.setState({ correlationId })
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <main className="container page-content">
          <ErrorState
            title="Cooksmith hit a snag"
            message="Nothing has been changed. Refresh the page and we’ll try that again."
            reference={this.state.correlationId}
            actionLabel="Refresh Cooksmith"
            onAction={() => window.location.reload()}
          />
        </main>
      )
    }

    return this.props.children
  }
}
