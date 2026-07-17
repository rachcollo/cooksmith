# v2 environment and preview setup

## Environment model

| Environment     | Frontend          | Supabase                        | Data                                 |
| --------------- | ----------------- | ------------------------------- | ------------------------------------ |
| Development     | Local Vite        | Local Supabase                  | Synthetic seeds                      |
| Feature Preview | Vercel Preview    | Approved non-production project | Synthetic or controlled test data    |
| Private MVP     | Vercel Production | Approved MVP Supabase project   | Test data only until launch approval |

During the temporary MVP workflow, `main` drives the existing Vercel project's primary deployment. This does not approve public launch, real customer data, a Production database migration or changes to projects, domains or provider tiers.

## Variables

Copy `.env.example` to `.env.local`. Values prefixed with `VITE_` are bundled into browser code and must never contain a secret or service-role credential.

| Variable                                     | Exposure   | Requirement                                   | Purpose                                                                       |
| -------------------------------------------- | ---------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_APP_ENV`                               | Public     | Optional; Vercel derives it from `VERCEL_ENV` | `development`, `test`, `preview` or `production`                              |
| `VITE_BUILD_COMMIT`                          | Public     | Optional                                      | Non-sensitive build reference shown on `/health`                              |
| `VITE_SUPABASE_URL`                          | Public     | Paired with publishable key                   | Local or environment-specific Supabase URL                                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`              | Public     | Paired with URL                               | Supabase publishable browser key, never the secret/service-role key           |
| `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` | Build-only | Required for Preview                          | Comma-separated Production project references denied to non-production builds |

Development may omit both Supabase public values while working on the shell. Preview and Production require both. One value without the other is invalid.

## Preview safety guard

Vite validates environment configuration before building:

- Vercel derives the environment from its trusted `VERCEL_ENV` value when `VITE_APP_ENV` is absent.
- An explicitly configured `VITE_APP_ENV` must match `VERCEL_ENV` or the build fails.
- Preview requires a hosted staging URL, not localhost.
- Preview requires the build-only Production project deny-list.
- Development and Preview reject a hosted project whose reference appears in that deny-list.
- Errors never include keys, complete URLs or project-reference values.

The deny-list does not replace Vercel environment separation. It provides a second deterministic guard against a mistaken project assignment.

## Temporary MVP deployment workflow

`vercel.json` declares the Vite build, `dist` output, single-page routing and baseline headers. Feature branches receive previews and reviewed merges to `main` update the primary deployment.

Repository-owner setup:

1. Keep `main` as the existing Vercel project's production branch.
2. Enable feature-branch and pull-request previews.
3. Configure Production-scoped public values for the private MVP separately from Preview values.
4. Use the primary deployment URL as the canonical application URL and Supabase Auth Site URL.
5. Do not copy secrets or real customer data between environments.
6. Verify `/`, `/health`, a nested deep link, protected-route redirection and authentication callbacks.

Before public beta, reinstate `feature branch → staging → production` and review environment, database, domain and release controls explicitly.

The repository contains no deployment or database credential.

## Local production smoke check

```bash
npm run build
npm run preview
```

Playwright starts this preview server automatically for `npm run test:e2e`. The static `/health.json` asset supports platform probes.

## Failure behaviour

Invalid public configuration stops normal bootstrap and renders a controlled error. Invalid build configuration fails before Vite creates deployable assets. Cooksmith never converts an unknown or missing environment into Production.

## Hosted preview validation checklist

Record evidence in the pull request before requesting review.

1. Retrieve the exact Vercel preview URL from the pull request deployment checks or Vercel dashboard.
2. Confirm the preview uses approved non-production Supabase public values and that Supabase Auth permits the preview callback URL, preferably through the approved wildcard redirect pattern for branch previews.
3. For PKCE flows, start on the preview URL, complete any Vercel Deployment Protection first, request a fresh magic link, and open it in the same browser context so the verifier remains on the same origin.
4. Run an authentication smoke test with a synthetic account: sign in, confirm the callback remains on the preview hostname, confirm the PKCE code is removed from the visible URL, refresh once, and sign out.
5. Run the feature-specific smoke test for the changed journey and record the account, route and expected outcome without storing credentials.
6. Check one mobile viewport and one desktop viewport for the changed journey, including keyboard-reachable controls and absence of horizontal overflow.
7. Record the preview URL, smoke-test result, unverified items, screenshots where useful, and any environment limitation in the pull request evidence section.

Do not automate real user credentials, magic-link inbox access or Production project changes for preview validation.
