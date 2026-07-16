# EP003 authentication PKCE validation

## Status

Implemented, hosted validation passed before this clean pull request was recreated.

## Scope

EP003 hardens the authentication bootstrap path used when Supabase returns a PKCE magic-link code to `/auth/confirm`. The implementation distinguishes stored-session restoration from callback code exchange so a successful exchange can authenticate immediately from the returned session instead of making a redundant validation call that can fail during hosted preview timing.

## Implemented behaviour

- Initial session resolution now returns typed outcomes for no session, existing stored session, stored-session errors, successful PKCE exchange, failed PKCE exchange and empty PKCE exchange.
- PKCE code exchange calls `exchangeCodeForSession(code)` exactly once and removes the code from the browser URL in a `finally` block.
- Successful PKCE exchange uses `session.user` from the exchange response as the initial authenticated identity.
- Existing stored sessions still validate with `getUser()` and locally sign out when validation fails.
- PKCE bootstrap failures throw safe `AuthBootstrapError` categories for callback rendering.
- Callback failures render safe user-facing copy that asks for a new magic link in the same browser and exposes only the safe category reference.

## Hosted validation evidence

The hosted preview was manually verified successfully after:

1. adding the preview URL to Supabase redirect URLs;
2. completing Vercel preview authentication before requesting the magic link;
3. opening the new link in the same browser context.

The successful hosted flow displayed “Email confirmed”, and “Continue to Cooksmith” opened the authenticated app without requiring a refresh.

## Safety and privacy

The callback error does not expose PKCE codes, tokens, provider payloads, stack traces or raw provider error messages. No production database, real household data, paid provider or configuration change is included in this implementation.

## Validation plan

Required local validation for the recreated clean branch:

```text
npm ci
npm run format
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```
