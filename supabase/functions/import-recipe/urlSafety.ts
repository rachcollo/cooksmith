const blockedV4 = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^192\.0\.(0|2)\./,
  /^198\.(1[89]|51\.100)\./,
  /^203\.0\.113\./,
  /^22[4-9]\./,
  /^23\d\./,
  /^24[0-9]\./,
  /^25[0-5]\./,
]

export function isBlockedAddress(address: string): boolean {
  const normalised = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (normalised.includes(':')) {
    if (normalised.startsWith('::ffff:')) return isBlockedAddress(normalised.slice(7))
    return (
      normalised === '::' ||
      normalised === '::1' ||
      normalised.startsWith('fc') ||
      normalised.startsWith('fd') ||
      /^fe[89ab]/.test(normalised) ||
      normalised.startsWith('ff') ||
      normalised.startsWith('2001:db8')
    )
  }
  return blockedV4.some((pattern) => pattern.test(normalised))
}

export function validatePublicUrl(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('invalid_url')
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) {
    throw new Error('invalid_url')
  }
  if (url.hostname === 'localhost' || isBlockedAddress(url.hostname)) throw new Error('blocked_url')
  url.hash = ''
  return url
}
