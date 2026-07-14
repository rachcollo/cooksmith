# v2 environment and preview setup

## Environment model

| Environment     | Frontend          | Supabase                     | Data                                      |
| --------------- | ----------------- | ---------------------------- | ----------------------------------------- |
| Development     | Local Vite        | Local Supabase               | Synthetic seeds                           |
| Preview/Staging | Vercel Preview    | One free staging project     | Synthetic or controlled test data         |
| Production      | Vercel Production | Future v2 Production project | Real customer data after release approval |

The current prototype Production application and database remain untouched. Cooksmith v2 Production provisioning is outside Milestone 3.

## Variables

Copy `.env.example` to `.env.local`. Values prefixed with `VITE_` are bundled into browser code and must never contain a secret or service-role credential.

| Variable                                     | Exposure   | Requirement                          | Purpose                                                                       |
| -------------------------------------------- | ---------- | ------------------------------------ | ----------------------------------------------------------------------------- |
| `VITE_APP_ENV`                               | Public     | Optional locally, required in Vercel | `development`, `test`, `preview` or `production`                              |
| `VITE_BUILD_COMMIT`                          | Public     | Optional                             | Non-sensitive build reference shown on `/health`                              |
| `VITE_SUPABASE_URL`                          | Public     | Paired with publishable key          | Local or environment-specific Supabase URL                                    |
| `VITE_SUPABASE_PUBLISHABLE_KEY`              | Public     | Paired with URL                      | Supabase publishable browser key, never the secret/service-role key           |
| `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` | Build-only | Required for Preview                 | Comma-separated Production project references denied to non-production builds |

Development may omit both Supabase public values while working on the shell. Preview and Production require both. One value without the other is invalid.

## Preview safety guard

Vite validates environment configuration before building:

- Vercel Preview must set `VITE_APP_ENV=preview`.
- Vercel Production must set `VITE_APP_ENV=production`.
- Preview requires a hosted staging URL, not localhost.
- Preview requires the build-only Production project deny-list.
- Development and Preview reject a hosted project whose reference appears in that deny-list.
- Errors never include keys, complete URLs or project-reference values.

The deny-list does not replace Vercel environment separation. It provides a second deterministic guard against a mistaken project assignment.

## Independent Vercel preview

`vercel.json` declares the Vite build, `dist` output, single-page routing and baseline headers. With Vercel Git integration enabled, each milestone branch can receive a preview without replacing the prototype on `main`.

Repository-owner setup:

1. Keep `main` as the existing prototype Production branch.
2. Enable branch and pull-request previews for v2 work.
3. Provision the free staging project using the [staging setup guide](staging-supabase-setup.md).
4. Add the four required Preview values through Vercel settings, with Preview scope only.
5. Do not copy Production credentials or customer data into Preview.
6. Verify `/`, `/health`, a nested deep link and the `X-Robots-Tag: noindex, nofollow` header.

The repository contains no deployment or database credential.

## Local production smoke check

```bash
npm run build
npm run preview
```

Playwright starts this preview server automatically for `npm run test:e2e`. The static `/health.json` asset supports platform probes.

## Failure behaviour

Invalid public configuration stops normal bootstrap and renders a controlled error. Invalid build configuration fails before Vite creates deployable assets. Cooksmith never converts an unknown or missing environment into Production.
