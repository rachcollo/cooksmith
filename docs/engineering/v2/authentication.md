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

For the temporary private MVP, the primary Vercel deployment URL is the canonical Cooksmith origin. In each hosted Supabase project:

1. Enable email/password sign-up, email confirmation, magic-link login, and password recovery.
2. Set the Site URL to the primary deployment URL for the `main` environment.
3. Allow exact primary callback URLs for `/auth/confirm` and `/auth/reset-password`. Add dedicated Preview callback URLs to the Preview project only. Avoid a broad wildcard when exact URLs are available.

The browser client uses PKCE and exchanges an incoming `code` explicitly before protected route guards render. Supabase's automatic URL detection remains disabled to prevent competing exchanges. The bootstrap removes the one-time code from the address bar after the exchange and also accepts a provider fallback to the application root, while `/auth/confirm` remains the canonical callback. 4. Keep refresh-token rotation enabled and anonymous sign-ins disabled.

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
