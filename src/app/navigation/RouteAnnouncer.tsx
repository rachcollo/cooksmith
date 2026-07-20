import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { VisuallyHidden } from '../../components/ui/VisuallyHidden'
import { trackPageView } from '../../infrastructure/observability/observability'
import { navigationItems } from './navigationItems'

export function RouteAnnouncer() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Path only: auth callback tokens live in the query and hash and must never
    // reach an analytics provider.
    trackPageView(pathname)
  }, [pathname])
  const route = navigationItems.find(({ path }) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path),
  )
  const label = route?.label ?? (pathname === '/health' ? 'Foundation status' : 'Page not found')

  return (
    <VisuallyHidden aria-live="polite" aria-atomic="true">
      {label} page loaded
    </VisuallyHidden>
  )
}
