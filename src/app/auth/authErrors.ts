import type { AuthError } from '@supabase/supabase-js'

export function authErrorMessage(error: Pick<AuthError, 'message' | 'status'>) {
  const message = error.message.toLowerCase()
  if (error.status === 429 || message.includes('rate'))
    return 'Please wait a moment before trying again.'
  if (message.includes('invalid login')) return 'The email or password is not correct.'
  if (message.includes('expired') || message.includes('otp'))
    return 'This link is invalid or has expired. Request a new one.'
  if (message.includes('network') || message.includes('fetch'))
    return 'We could not connect. Check your connection and try again.'
  return 'Authentication could not be completed. Please try again.'
}
