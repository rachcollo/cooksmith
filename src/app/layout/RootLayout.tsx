import { Settings } from 'lucide-react'
import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'

import { PrimaryNavigation } from '../navigation/PrimaryNavigation'
import { RouteAnnouncer } from '../navigation/RouteAnnouncer'
import { useAppConfig } from '../providers/appConfigContext'
import { PageContainer } from '../../components/layout/LayoutPrimitives'
import { LoadingState } from '../../components/ui/LoadingState'

export function RootLayout() {
  const { appEnvironment } = useAppConfig()

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
          <span>
            <strong>Cooksmith</strong>
            <small>A calmer fortnight</small>
          </span>
        </Link>
        <PrimaryNavigation variant="desktop" />
        <p className="rail-note">v2 foundation preview</p>
      </aside>

      <header className="site-header">
        <PageContainer className="header-inner">
          <Link className="brand" to="/" aria-label="Cooksmith home">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>
            <span>
              <strong>Cooksmith</strong>
              <small>A calmer fortnight</small>
            </span>
          </Link>

          <NavLink className="header-settings" to="/settings" aria-label="Settings">
            <Settings aria-hidden="true" />
          </NavLink>
        </PageContainer>
      </header>

      <main id="main-content" className="page-content" tabIndex={-1}>
        <PageContainer>
          {appEnvironment !== 'production' ? (
            <p className="environment-badge">
              {appEnvironment === 'preview' ? 'v2 preview' : `v2 ${appEnvironment} preview`}
            </p>
          ) : null}
          <Suspense fallback={<LoadingState label="Opening page" />}>
            <Outlet />
          </Suspense>
        </PageContainer>
      </main>

      <footer className="site-footer">
        <PageContainer>
          <p>Cooksmith v2 foundation. No household data is connected yet.</p>
        </PageContainer>
      </footer>

      <PrimaryNavigation variant="mobile" />
      <RouteAnnouncer />
    </div>
  )
}
