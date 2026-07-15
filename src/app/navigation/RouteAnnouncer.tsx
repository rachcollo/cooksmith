import { useLocation } from 'react-router-dom'

import { VisuallyHidden } from '../../components/ui/VisuallyHidden'
import { navigationItems } from './navigationItems'

export function RouteAnnouncer() {
  const { pathname } = useLocation()
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
