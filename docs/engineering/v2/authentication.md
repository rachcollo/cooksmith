# Authentication foundation

Milestone 6A adds authentication only. Profile and household creation remain deliberately absent.

## Architecture

The browser creates one typed Supabase client with PKCE, persisted sessions, automatic token refresh, and callback detection enabled. `AuthProvider` owns session restoration and validates a restored session with `getUser()` before protected routes render. Supabase Auth establishes identity; the database RLS model from Milestone 5 remains the final authorisation boundary.

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

In each hosted Supabase project:

1. Enable email/password sign-up, email confirmation, magic-link login, and password recovery.
2. Set the Site URL to that environment's canonical Cooksmith origin.
3. Allow exact callback origins for `/auth/confirm` and `/auth/reset-password`. Add the dedicated Vercel Preview domain to the Preview project only. Avoid a broad wildcard when an exact Preview domain is available.
4. Keep refresh-token rotation enabled and anonymous sign-ins disabled.

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
