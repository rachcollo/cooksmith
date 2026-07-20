import type { PublicEnv } from '../../config/env'
import { logger } from '../logging/logger'

export type AnalyticsEvent =
  | 'account_created'
  | 'onboarding_completed'
  | 'recipe_created'
  | 'recipe_imported'
  | 'meal_planned'
  | 'shopping_list_generated'
  | 'shopping_item_completed'

export type AnalyticsProperties = Record<string, string | number | boolean>

export interface ObservabilityBackend {
  captureError(error: unknown, context: Record<string, string>): void
  track(event: AnalyticsEvent, properties?: AnalyticsProperties): void
  trackPageView(path: string): void
}

const noopBackend: ObservabilityBackend = {
  captureError: () => undefined,
  track: () => undefined,
  trackPageView: () => undefined,
}

let backend: ObservabilityBackend = noopBackend

export function setObservabilityBackend(next: ObservabilityBackend | null): void {
  backend = next ?? noopBackend
}

export function captureError(error: unknown, context: Record<string, string> = {}): void {
  backend.captureError(error, context)
}

export function track(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  backend.track(event, properties)
}

export function trackPageView(path: string): void {
  backend.trackPageView(path)
}

// Initialises Sentry and PostHog only when their public keys are configured, so
// local development, tests and CI run with the no-op backend by default. SDKs
// load through dynamic imports to stay out of the main bundle. Events carry
// counts and slugs only; household content, names and emails are never sent.
export async function initObservability(config: PublicEnv): Promise<void> {
  const sentryDsn = config.sentryDsn
  const posthogConfig = config.posthog
  if (!sentryDsn && !posthogConfig) return

  const [sentry, posthog] = await Promise.all([
    sentryDsn ? import('@sentry/browser') : Promise.resolve(null),
    posthogConfig ? import('posthog-js').then((module) => module.default) : Promise.resolve(null),
  ]).catch((loadError: unknown) => {
    logger.error('observability_init_failed', {
      errorName: loadError instanceof Error ? loadError.name : 'unknown',
    })
    return [null, null] as const
  })

  if (sentry && sentryDsn) {
    sentry.init({
      dsn: sentryDsn,
      environment: config.appEnvironment,
      release: config.buildCommit,
      sendDefaultPii: false,
      tracesSampleRate: 0,
    })
  }

  if (posthog && posthogConfig) {
    posthog.init(posthogConfig.key, {
      api_host: posthogConfig.host,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: 'localStorage',
    })
  }

  backend = {
    captureError(error, context) {
      sentry?.captureException(error, { tags: context })
    },
    track(event, properties) {
      posthog?.capture(event, properties)
    },
    trackPageView(path) {
      posthog?.capture('$pageview', { path })
    },
  }
}
