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
  const shoppingLongPressed = useRef(false)
  const shoppingActive = location.pathname.startsWith('/shopping')

  function clearLongPressTimer() {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function openShoppingMenu() {
    clearLongPressTimer()
    shoppingLongPressed.current = true
    setShoppingMenuOpen(true)
  }

  function startShoppingLongPress() {
    shoppingLongPressed.current = false
    clearLongPressTimer()
    longPressTimer.current = window.setTimeout(openShoppingMenu, 450)
  }

  function finishShoppingPress() {
    clearLongPressTimer()
    if (shoppingLongPressed.current) {
      shoppingLongPressed.current = false
      return
    }
    setShoppingMenuOpen(false)
    navigate('/shopping')
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
            <button
              type="button"
              className="navigation-link"
              aria-current={shoppingActive ? 'page' : undefined}
              aria-haspopup="menu"
              aria-expanded={shoppingMenuOpen}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                  setShoppingMenuOpen(false)
                }
              }}
              onClick={finishShoppingPress}
              onContextMenu={(event) => {
                event.preventDefault()
                openShoppingMenu()
              }}
              onPointerCancel={clearLongPressTimer}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return
                startShoppingLongPress()
              }}
              onPointerLeave={clearLongPressTimer}
              onPointerUp={clearLongPressTimer}
              onTouchStart={(event) => {
                event.preventDefault()
                startShoppingLongPress()
              }}
              onTouchEnd={(event) => {
                event.preventDefault()
                finishShoppingPress()
              }}
              onTouchCancel={clearLongPressTimer}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
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
