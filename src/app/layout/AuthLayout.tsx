import { Link, Outlet, useSearchParams } from 'react-router-dom'
import { authEntryPath } from '../../application/auth/redirects'

export function AuthLayout() {
  const [params] = useSearchParams()
  return (
    <main className="auth-shell" id="main-content">
      <Link className="brand" to={authEntryPath('/welcome', params.get('returnTo'))}>
        <span className="brand-mark" aria-hidden="true">
          C
        </span>
        <strong>Cooksmith</strong>
      </Link>
      <div className="auth-card">
        <Outlet />
      </div>
    </main>
  )
}
