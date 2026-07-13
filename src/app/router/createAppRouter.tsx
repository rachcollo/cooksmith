import {
  createBrowserRouter,
  createMemoryRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router-dom'

import { RootLayout } from '../layout/RootLayout'
import { RouteErrorPage } from '../errors/RouteErrorPage'
import { HealthPage } from '../../routes/HealthPage'
import { HomePage } from '../../routes/HomePage'
import { NotFoundPage } from '../../routes/NotFoundPage'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'health', element: <HealthPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(appRoutes)
}

export function createTestRouter(initialEntries: InitialEntry[] = ['/']) {
  return createMemoryRouter(appRoutes, { initialEntries })
}
