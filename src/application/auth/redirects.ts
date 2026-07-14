const authCallbackPaths = new Set(['/auth/confirm', '/auth/reset-password'])

export function safeReturnPath(value: string | null | undefined, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback

  try {
    const url = new URL(value, 'https://cooksmith.invalid')
    return url.origin === 'https://cooksmith.invalid'
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback
  } catch {
    return fallback
  }
}

export function authRedirectUrl(path: string, origin = window.location.origin) {
  if (!authCallbackPaths.has(path)) throw new Error('Unsupported authentication redirect path.')
  return new URL(path, origin).toString()
}
