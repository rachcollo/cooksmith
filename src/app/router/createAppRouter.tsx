import {
  createBrowserRouter,
  createMemoryRouter,
  type InitialEntry,
  type RouteObject,
} from 'react-router-dom'

import { RootLayout } from '../layout/RootLayout'
import { AuthLayout } from '../layout/AuthLayout'
import { PublicOnlyRoute, RequireApplicationAdmin, RequireAuth } from '../auth/RouteGuards'
import { OnboardingGate } from '../onboarding/OnboardingGate'
import { RouteErrorPage } from '../errors/RouteErrorPage'
import { LoadingState } from '../../components/ui/LoadingState'
import {
  GetAheadPage,
  AdminPage,
  AdminRecipesPage,
  HealthPage,
  HomePage,
  NotFoundPage,
  PantryPage,
  PlanPage,
  RecipesPage,
  SettingsPage,
  ShoppingPage,
} from './routeModules'
import {
  CreateAccountPage,
  EmailConfirmationPage,
  ForgotPasswordPage,
  MagicLinkPage,
  ResetPasswordPage,
  SignInPage,
  WelcomePage,
} from '../../routes/auth/AuthPages'
import { OnboardingPage } from '../../routes/onboarding/OnboardingPage'
import { InvitationAcceptancePage } from '../../routes/InvitationAcceptancePage'

export const appRoutes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: 'welcome', element: <WelcomePage /> },
              { path: 'auth/sign-in', element: <SignInPage /> },
              { path: 'auth/create-account', element: <CreateAccountPage /> },
              { path: 'auth/magic-link', element: <MagicLinkPage /> },
              { path: 'auth/forgot-password', element: <ForgotPasswordPage /> },
            ],
          },
        ],
      },
      {
        element: <AuthLayout />,
        children: [
          { path: 'auth/reset-password', element: <ResetPasswordPage /> },
          { path: 'auth/confirm', element: <EmailConfirmationPage /> },
        ],
      },
      { path: 'health', element: <HealthPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'invitations/accept', element: <InvitationAcceptancePage /> },
          {
            element: <OnboardingGate />,
            children: [
              { path: 'onboarding', element: <OnboardingPage /> },
              {
                path: '/',
                element: <RootLayout />,
                children: [
                  { index: true, element: <HomePage /> },
                  { path: 'pantry', element: <PantryPage /> },
                  { path: 'recipes', element: <RecipesPage /> },
                  { path: 'plan', element: <PlanPage /> },
                  { path: 'shopping', element: <ShoppingPage /> },
                  { path: 'get-ahead', element: <GetAheadPage /> },
                  { path: 'settings', element: <SettingsPage /> },
                  {
                    element: <RequireApplicationAdmin />,
                    children: [
                      { path: 'admin', element: <AdminPage /> },
                      { path: 'admin/recipes', element: <AdminRecipesPage /> },
                    ],
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
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
