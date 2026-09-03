const authCallbackPaths = new Set(['/auth/confirm', '/auth/reset-password'])

export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\'))
    return fallback

  try {
    const url = new URL(value, 'https://cooksmith.invalid')
    return url.origin === 'https://cooksmith.invalid' && !url.username && !url.password
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
