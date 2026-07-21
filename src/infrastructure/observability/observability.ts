import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

import type { PublicEnv } from '../../config/env'
import { logger } from '../logging/logger'

// Privacy-first observability. Both tools are off in development and test and
// when their configuration is absent. No session replay or session recording,
// no user identification, IP addresses are not stored, URL query strings are
// stripped, and known sensitive fields are scrubbed before anything is sent.
// See engineering/ready/cs57-observability-sentry-posthog.md.

const SENSITIVE_KEY = /(authorization|cookie|email|password|secret|token)/i
const EMAIL_VALUE = /[^\s@]+@[^\s@]+\.[^\s@]+/

interface SentryLike {
  init(options: Record<string, unknown>): void
}

interface PosthogLike {
  init(token: string, config: Record<string, unknown>): void
}

export interface InitObservabilityOptions {
  mode?: string
  posthog?: PosthogLike
  sentry?: SentryLike
}

export interface ObservabilityResult {
  analytics: boolean
  sentry: boolean
}

export function shouldActivate(env: PublicEnv, mode: string): boolean {
  if (mode === 'test') return false
  return env.appEnvironment === 'preview' || env.appEnvironment === 'production'
}

// Reduce a URL to scheme, host and path, dropping query string and fragment so
// values such as auth callback codes or returnTo targets are never captured.
export function scrubUrl(rawUrl: unknown): string | undefined {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return undefined
  try {
    const url = new URL(rawUrl)
    return `${url.origin}${url.pathname}`
  } catch {
    return rawUrl.replace(/[?#].*$/, '')
  }
}

function scrubRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([key, value]) => {
      if (SENSITIVE_KEY.test(key)) return false
      if (typeof value === 'string' && EMAIL_VALUE.test(value)) return false
      return true
    }),
  )
}

// Sentry beforeSend hook: strip request metadata that can carry personal data,
// scrub the URL and drop any user identity. Kept resilient so a malformed event
// never throws inside the SDK.
export function scrubSentryEvent(event: Record<string, unknown>): Record<string, unknown> {
  try {
    const request = event.request as Record<string, unknown> | undefined
    if (request) {
      if (typeof request.url === 'string') request.url = scrubUrl(request.url)
      delete request.cookies
      if (request.headers && typeof request.headers === 'object') {
        request.headers = scrubRecord(request.headers as Record<string, unknown>)
      }
      if (request.query_string) delete request.query_string
    }

    delete event.user

    if (event.extra && typeof event.extra === 'object') {
      event.extra = scrubRecord(event.extra as Record<string, unknown>)
    }
  } catch (error) {
    logger.warn('observability.sentry.scrub_failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    })
  }
  return event
}

// PostHog sanitize_properties hook: strip query strings from captured URLs and
// remove any property whose key or value looks personal.
export function sanitisePosthogProperties(
  properties: Record<string, unknown>,
): Record<string, unknown> {
  const scrubbed = scrubRecord(properties)
  for (const key of ['$current_url', '$referrer', '$pathname']) {
    if (typeof scrubbed[key] === 'string') scrubbed[key] = scrubUrl(scrubbed[key])
  }
  return scrubbed
}

export function initObservability(
  env: PublicEnv,
  options: InitObservabilityOptions = {},
): ObservabilityResult {
  const mode = options.mode ?? import.meta.env.MODE
  const result: ObservabilityResult = { analytics: false, sentry: false }

  if (!shouldActivate(env, mode)) return result

  const sentryClient: SentryLike = options.sentry ?? Sentry
  const posthogClient: PosthogLike = options.posthog ?? posthog

  try {
    if (env.observability?.sentryDsn) {
      sentryClient.init({
        dsn: env.observability.sentryDsn,
        environment: env.appEnvironment,
        release: env.buildCommit,
        sendDefaultPii: false,
        tracesSampleRate: 0,
        beforeSend: scrubSentryEvent,
      })
      result.sentry = true
    }
  } catch (error) {
    logger.error('observability.sentry.init_failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    })
  }

  try {
    if (env.analytics?.posthogKey) {
      posthogClient.init(env.analytics.posthogKey, {
        api_host: env.analytics.posthogHost,
        person_profiles: 'identified_only',
        capture_pageview: true,
        autocapture: false,
        disable_session_recording: true,
        property_denylist: ['$ip'],
        sanitize_properties: sanitisePosthogProperties,
      })
      result.analytics = true
    }
  } catch (error) {
    logger.error('observability.posthog.init_failed', {
      reason: error instanceof Error ? error.message : 'unknown',
    })
  }

  return result
}
