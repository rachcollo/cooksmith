const authCallbackPaths = new Set(['/auth/confirm', '/auth/reset-password'])
const applicationPaths = new Set([
  '/',
  '/pantry',
  '/recipes',
  '/plan',
  '/shopping',
  '/get-ahead',
  '/settings',
  '/admin',
  '/admin/recipes',
  '/invitations/accept',
])

type AuthEntryPath =
  | '/welcome'
  | '/auth/sign-in'
  | '/auth/create-account'
  | '/auth/magic-link'
  | '/auth/forgot-password'

export function authEntryPath(path: AuthEntryPath, returnTo: string | null | undefined) {
  return `${path}?${new URLSearchParams({ returnTo: safeReturnPath(returnTo) })}`
}

export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback

  try {
    const url = new URL(value, 'https://cooksmith.invalid')
    return url.origin === 'https://cooksmith.invalid' &&
      !url.username &&
      !url.password &&
      applicationPaths.has(url.pathname)
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback
  } catch {
    return fallback
  }
}

export function emailAuthRedirectUrl(
  returnTo: string | null | undefined,
  origin = window.location.origin,
) {
  const url = new URL(authRedirectUrl('/auth/confirm', origin))
  url.searchParams.set('returnTo', safeReturnPath(returnTo))
  return url.toString()
}

export function authRedirectUrl(path: string, origin = window.location.origin) {
  if (!authCallbackPaths.has(path)) throw new Error('Unsupported authentication redirect path.')
  return new URL(path, origin).toString()
}
