import { Link, Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="auth-shell" id="main-content">
      <Link className="brand" to="/welcome">
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
