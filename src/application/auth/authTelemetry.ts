import { logger } from '../../infrastructure/logging/logger'

export type AuthTelemetryEvent =
  | { name: 'email_requested'; outcome: 'accepted' | 'failed' }
  | {
      name: 'auth_callback'
      outcome:
        'token_hash_success' | 'token_hash_failed' | 'legacy_success' | 'legacy_failed' | 'invalid'
    }
  | { name: 'auth_recovery'; outcome: 'fresh_email' | 'password_sign_in' }

export function recordAuthEvent(event: AuthTelemetryEvent) {
  logger.info(`auth.${event.name}`, { outcome: event.outcome })
}
