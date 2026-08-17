import { useEffect, useRef } from 'react'
import * as Sentry from '@sentry/react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'

import { ErrorState } from '../../components/ui/ErrorState'
import { logger } from '../../infrastructure/logging/logger'
import { createCorrelationId } from '../../shared/utils/createCorrelationId'

export function RouteErrorPage() {
  const error = useRouteError()
  const correlationId = useRef(createCorrelationId()).current
  const status = isRouteErrorResponse(error) ? error.status : undefined

  useEffect(() => {
    logger.error('route_render_failed', {
      correlationId,
      status,
    })
    Sentry.captureException(
      error instanceof Error ? error : new Error('Unknown route rendering failure'),
      {
        tags: { correlationId, routeFailure: 'true' },
        extra: { status },
      },
    )
  }, [correlationId, error, status])

  return (
    <main className="container page-content">
      <ErrorState
        title="That page did not come together"
        message="The rest of Cooksmith is still safe. Head home and try another path."
        reference={correlationId}
        href="/"
        actionLabel="Back to Cooksmith"
      />
    </main>
  )
}
