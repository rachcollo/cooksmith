# v2 environment and preview setup

## Local environment

Copy `.env.example` to `.env.local` when local build metadata is useful. The shell runs without it.

| Variable            | Exposure             | Required | Purpose                                                   |
| ------------------- | -------------------- | -------: | --------------------------------------------------------- |
| `VITE_APP_ENV`      | Public browser value |       No | One of `development`, `test`, `preview` or `production`   |
| `VITE_BUILD_COMMIT` | Public browser value |       No | Optional non-sensitive build reference shown on `/health` |

The application validates public values before rendering and displays a controlled configuration error for invalid values. Variables prefixed with `VITE_` are bundled for the browser and must never contain credentials, tokens or private household information.

Server-only environment variables are not needed in this milestone. When a later milestone introduces them, validate them in a server-only module that is never imported by browser code.

## Independent Vercel preview

`vercel.json` declares the Vite build, `dist` output, single-page application routing and baseline response headers. With Vercel Git integration enabled, each pull request or branch can receive a preview without replacing the production prototype.

Repository-owner setup:

1. Keep `main` as the Vercel production branch for the existing prototype.
2. Confirm branch and pull-request preview deployments are enabled for the v2 repository or project.
3. Set `VITE_APP_ENV=preview` for the Preview environment only.
4. Optionally set `VITE_BUILD_COMMIT` to a non-sensitive build reference.
5. Do not copy production credentials into the v2 preview.
6. Verify `/`, `/health`, a deep link such as `/unknown-route`, and the `X-Robots-Tag: noindex, nofollow` response header.

The repository contains no deployment credential. Vercel project membership and Git integration remain manual platform configuration.

## Local production smoke check

```bash
npm run build
npm run preview
```

Playwright starts this preview server automatically when `npm run test:e2e` runs. The static `/health.json` asset is available for platform health probes, while `/health` verifies the rendered shell.

## Missing or invalid values

An absent optional variable uses a safe development default. An invalid `VITE_APP_ENV` stops normal bootstrap and renders a controlled error message. Configuration errors are not silently converted into production settings.
