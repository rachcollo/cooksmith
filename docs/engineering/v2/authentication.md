# Authentication foundation

Milestone 6A adds authentication only. Profile and household creation remain deliberately absent.

## Architecture

The browser creates one typed Supabase client with PKCE, persisted sessions and automatic token refresh. `AuthProvider` owns session restoration and validates a restored session with `getUser()` before protected routes render. Supabase Auth establishes identity; the database RLS model from Milestone 5 remains the final authorisation boundary.

Only `/health` and authentication routes are public. Product routes use `RequireAuth`. Public-only sign-in routes redirect an already authenticated user. Return destinations must be relative same-application paths; external and protocol-relative redirects are rejected.

The SPA uses Supabase JS browser session storage. It does not create application cookies or claim HttpOnly cookie protection; that would require an approved server/SSR boundary. Never place a service-role key, SMTP password, or Resend API key in a `VITE_` variable.

## Environment variables

| Variable                                     | Surface       | Purpose                                           |
| -------------------------------------------- | ------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`                          | Browser       | Environment-specific Supabase URL                 |
| `VITE_SUPABASE_PUBLISHABLE_KEY`              | Browser       | Publishable/anonymous client key                  |
| `VITE_APP_ENV`                               | Browser/build | `development`, `test`, `preview`, or `production` |
| `COOKSMITH_PRODUCTION_SUPABASE_PROJECT_REFS` | Build only    | Denylist used by Preview safety validation        |

Local values come from `supabase status` after `npm run db:start`. Mailpit at `http://127.0.0.1:54324` captures local auth email. Hosted Preview and Production must use separate Supabase projects and separately configured secrets.

## Supabase Auth and redirects

For the temporary private MVP, the primary Vercel deployment URL is the canonical Cooksmith origin. In each hosted Supabase project:

1. Enable email/password sign-up, email confirmation, magic-link login, and password recovery.
2. Set the Site URL to the primary deployment URL for the `main` environment.
3. Allow exact primary callback URLs for `/auth/confirm` and `/auth/reset-password`. Add dedicated Preview callback URLs to the Preview project only. Avoid a broad wildcard when exact URLs are available.

Email confirmation and passwordless templates send `token_hash` and the allow-listed `email` type to `/auth/confirm`. The bootstrap calls `verifyOtp()` so opening an email from Outlook or another client in Safari does not depend on browser-local PKCE state. Supabase's automatic URL detection remains disabled to prevent competing exchanges. A legacy `code` exchange remains only for already-issued links during rollout. Mixed, duplicated or unsupported callback parameters fail closed, and one-time parameters are removed from browser history before verification completes.

The email redirect passed by Cooksmith always includes a validated internal `returnTo` value. Hosted templates use `{{ .RedirectTo }}` so Production resolves to `https://app.smillins.com.au/auth/confirm` while an explicitly allow-listed Preview remains on its requesting Preview origin. Keep refresh-token rotation enabled and anonymous sign-ins disabled.

Household invitations reuse the same Supabase magic-link delivery channel and exact `/auth/confirm` callback. The callback carries a validated same-origin return path to `/invitations/accept`; no additional redirect domain, browser email credential, or alternative code-exchange path is introduced. The invitation token is distinct from the Supabase authentication code.

Local equivalents are committed in `supabase/config.toml`.

## Resend SMTP

Configure this in **Supabase Dashboard → Authentication → SMTP Settings**, separately for Preview and Production:

| Setting      | Value                                             |
| ------------ | ------------------------------------------------- |
| Host         | `smtp.resend.com`                                 |
| Port         | `465` (TLS)                                       |
| Username     | `resend`                                          |
| Password     | A server-side Resend API key for that environment |
| Sender name  | `Cooksmith`                                       |
| Sender email | `hello@smillins.com.au`                           |

The `smillins.com.au` domain must be verified in Resend before delivery. Configure Supabase templates for confirmation, magic link, and password recovery so their action URL uses the supplied confirmation URL. Invitation email is intentionally not configured. Keep rate limits conservative and test delivery in Preview before Production.

## Verification

Run `npm run validate:static`, `npm run db:config:check`, and `npm run test:e2e`. Complete a hosted smoke check for account confirmation, magic link, reset, refresh, and sign-out after SMTP credentials and redirect URLs are entered.
