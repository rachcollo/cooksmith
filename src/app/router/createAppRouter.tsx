import {
  createBrowserRouter,
  createMemoryRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router-dom'

import { RootLayout } from '../layout/RootLayout'
import { RouteErrorPage } from '../errors/RouteErrorPage'
import { LoadingState } from '../../components/ui/LoadingState'
import {
  HealthPage,
  HomePage,
  NotFoundPage,
  PantryPage,
  PlanPage,
  RecipesPage,
  SettingsPage,
  ShoppingPage,
} from './routeModules'

export const appRoutes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'pantry', element: <PantryPage /> },
      { path: 'recipes', element: <RecipesPage /> },
      { path: 'plan', element: <PlanPage /> },
      { path: 'shopping', element: <ShoppingPage /> },
      { path: 'settings', element: <SettingsPage /> },
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

export function createRouteErrorTestRouter() {
  const routes: RouteObject[] = [
    {
      path: '/',
      element: <RootLayout />,
      errorElement: <RouteErrorPage />,
      HydrateFallback: () => <LoadingState label="Opening test route" fullPage />,
      children: [
        {
          index: true,
          loader: () => {
            throw new Error('Controlled route test failure')
          },
          element: <div />,
        },
      ],
    },
  ]

  return createMemoryRouter(routes, { initialEntries: ['/'] })
}
