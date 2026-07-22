import { useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { mobileNavigationItems, navigationItems } from './navigationItems'

interface PrimaryNavigationProps {
  variant: 'mobile' | 'desktop'
}

export function PrimaryNavigation({ variant }: PrimaryNavigationProps) {
  const items = variant === 'mobile' ? mobileNavigationItems : navigationItems
  const location = useLocation()
  const navigate = useNavigate()
  const [shoppingMenuOpen, setShoppingMenuOpen] = useState(false)
  const longPressTimer = useRef<number | null>(null)

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function openShoppingMenu() {
    clearLongPressTimer()
    setShoppingMenuOpen(true)
  }

  function startShoppingLongPress() {
    clearLongPressTimer()
    longPressTimer.current = window.setTimeout(openShoppingMenu, 550)
  }

  function requestPantryRestock() {
    setShoppingMenuOpen(false)
    window.sessionStorage.setItem('cooksmith:open-pantry-restock', 'true')
    if (location.pathname !== '/shopping') navigate('/shopping')
    window.dispatchEvent(new CustomEvent('cooksmith:open-pantry-restock'))
  }

  return (
    <nav
      aria-label={variant === 'mobile' ? 'Primary mobile navigation' : 'Primary navigation'}
      className={`primary-navigation navigation-${variant}`}
    >
      {items.map(({ end, icon: Icon, label, path }) =>
        label === 'Shopping' ? (
          <div className="navigation-item-with-menu" key={path}>
            <NavLink
              end={end}
              to={path}
              aria-haspopup="menu"
              aria-expanded={shoppingMenuOpen}
              onContextMenu={(event) => {
                event.preventDefault()
                openShoppingMenu()
              }}
              onPointerCancel={clearLongPressTimer}
              onPointerDown={startShoppingLongPress}
              onPointerLeave={clearLongPressTimer}
              onPointerUp={clearLongPressTimer}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
            {shoppingMenuOpen ? (
              <div className="navigation-submenu" role="menu">
                <button type="button" role="menuitem" onClick={requestPantryRestock}>
                  Restock pantry
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <NavLink end={end} key={path} to={path} onFocus={() => setShoppingMenuOpen(false)}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ),
      )}
    </nav>
  )
}
