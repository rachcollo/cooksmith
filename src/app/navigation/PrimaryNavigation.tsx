import { NavLink } from 'react-router-dom'

import { mobileNavigationItems, navigationItems } from './navigationItems'

interface PrimaryNavigationProps {
  variant: 'mobile' | 'desktop'
}

export function PrimaryNavigation({ variant }: PrimaryNavigationProps) {
  const items = variant === 'mobile' ? mobileNavigationItems : navigationItems

  return (
    <nav
      aria-label={variant === 'mobile' ? 'Primary mobile navigation' : 'Primary navigation'}
      className={`primary-navigation navigation-${variant}`}
    >
      {items.map(({ end, icon: Icon, label, path }) => (
        <NavLink end={end} key={path} to={path}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
