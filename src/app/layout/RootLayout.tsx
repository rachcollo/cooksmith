import { Link, NavLink, Outlet } from 'react-router-dom'

import { useAppConfig } from '../providers/appConfigContext'

export function RootLayout() {
  const { appEnvironment } = useAppConfig()

  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label="Cooksmith v2 home">
            <span className="brand-mark" aria-hidden="true">
              C
            </span>
            <span>
              <strong>Cooksmith</strong>
              <small>Forge a calmer fortnight</small>
            </span>
          </Link>

          <nav aria-label="Foundation navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/health">Status</NavLink>
          </nav>
        </div>
      </header>

      <main id="main-content" className="container page-content" tabIndex={-1}>
        {appEnvironment !== 'production' ? (
          <p className="environment-badge">
            {appEnvironment === 'preview' ? 'v2 preview' : `v2 ${appEnvironment} preview`}
          </p>
        ) : null}
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>Cooksmith v2 foundation. No household data is connected yet.</p>
        </div>
      </footer>
    </div>
  )
}
