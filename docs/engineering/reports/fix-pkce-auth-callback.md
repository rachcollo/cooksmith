# PKCE authentication callback fix

## Status

Complete locally; hosted magic-link verification pending deployment of the pull-request preview.

## Baseline and summary

- Baseline: `main` at `38cd34312f9e46cecc68faec9d23f8fb8cd51667`.
- Branch: `fix/pkce-auth-callback`.
- Supabase URL configuration was confirmed correct before implementation.
- The client now exchanges a returned PKCE authorisation code before route guards render and removes the one-time code from browser history.
- Supabase automatic URL detection is disabled so only one code exchange owns initial session restoration.
- A regression test reproduces the hosted `/?code=...` provider fallback and verifies authenticated routing.

## Validation

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- Focused authentication integration suite: passed, 3 tests.
- `npm test`: passed, 40 tests.
- `npm run build`: passed.
- `npm run db:config:check`: passed; migrations unchanged.
- `git diff --check`: passed.

No dependency, schema, migration, secret, provider or cost change was made. Cost impact is A$0. Hosted verification requires a fresh magic link after deployment because authentication links are single-use.
