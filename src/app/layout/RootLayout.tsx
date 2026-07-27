import { Settings } from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'

import { PrimaryNavigation } from '../navigation/PrimaryNavigation'
import { RouteAnnouncer } from '../navigation/RouteAnnouncer'
import { PageContainer } from '../../components/layout/LayoutPrimitives'
import { LoadingState } from '../../components/ui/LoadingState'
import { useAuth } from '../auth/authContext'

export function RootLayout() {
  const { signOut } = useAuth()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accountMenuOpen) return undefined

    function closeAccountMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    function closeAccountMenuWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
        accountMenuRef.current?.querySelector<HTMLButtonElement>('.account-menu-trigger')?.focus()
      }
    }

    document.addEventListener('mousedown', closeAccountMenu)
    document.addEventListener('keydown', closeAccountMenuWithEscape)

    return () => {
      document.removeEventListener('mousedown', closeAccountMenu)
      document.removeEventListener('keydown', closeAccountMenuWithEscape)
    }
  }, [accountMenuOpen])

  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className="desktop-rail">
        <Link className="brand brand-desktop" to="/" aria-label="Cooksmith home">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <strong>Cooksmith</strong>
        </Link>
        <PrimaryNavigation variant="desktop" />
      </aside>

      <header className="site-header">
        <PageContainer className="header-inner">
          <Link className="brand" to="/" aria-label="Cooksmith home">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>
            <strong>Cooksmith</strong>
          </Link>

          <div className="account-menu" ref={accountMenuRef}>
            <button
              type="button"
              className="account-menu-trigger"
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <Settings aria-hidden="true" />
            </button>
            {accountMenuOpen ? (
              <div className="account-menu-popover" role="menu" aria-label="Account">
                <Link role="menuitem" to="/settings" onClick={() => setAccountMenuOpen(false)}>
                  Settings
                </Link>
                <button type="button" role="menuitem" onClick={() => void signOut()}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </PageContainer>
      </header>

      <main id="main-content" className="page-content" tabIndex={-1}>
        <PageContainer>
          <Suspense fallback={<LoadingState label="Opening page" />}>
            <Outlet />
          </Suspense>
        </PageContainer>
      </main>

      <footer className="site-footer">
        <PageContainer>
          <p>Cooksmith MVP foundation. Your household preferences stay private.</p>
        </PageContainer>
      </footer>

      <PrimaryNavigation variant="mobile" />
      <RouteAnnouncer />
    </div>
  )
}
