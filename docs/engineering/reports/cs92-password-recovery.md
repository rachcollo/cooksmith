# CS-92 implementation report: Cross-browser password recovery

## Delivery identity

- **Jira issue:** CS-92
- **Branch:** `fix/cs-92-password-recovery`
- **Base:** `main` at `cf5e02434c729f00905d17c052a1070a7e5d4ff6`
- **Date:** 6 September 2026

## Outcome

Password recovery now uses the same browser-independent token-hash approach as Cooksmith's signup
and magic-link journeys. A reset requested in one browser can be opened from an email application in
Safari or another browser, verified by Supabase, and continued directly on **Choose a new password**.

The reset-request result is deliberately neutral whether or not an account exists. The user sees:
“If an account exists for this email, we’ve sent a password reset link.” This protects people from
account enumeration and contains no tester-specific guidance.

The existing final onboarding step now offers an optional password. A person can set and confirm a
password while their Supabase session is active, or choose **Skip for now** and continue using secure
email links.

## Implementation

- Added a local Supabase recovery template that links to `.RedirectTo` with `token_hash` and the
  allow-listed `recovery` type.
- Restricted token-hash email verification to `/auth/confirm` and recovery verification to
  `/auth/reset-password`; mismatched types fail closed.
- Added typed recovery success, invalid-link and missing-session outcomes without exposing provider
  errors or one-time values.
- Removed callback secrets from browser history before verification, consistent with the existing
  CS-92 contract.
- Added password-specific recovery copy and a fresh-reset action for expired or reused links.
- Added the optional password action to onboarding without changing durable onboarding completion
  or household provisioning.

## Verification

- Focused authentication, onboarding and template run: 31 tests passed across 4 files.
- `npm run preflight`: passed.
- `npm run db:config:check`: passed; 55 migrations validated and no migration changed.
- `npm run docs:commands:check`: passed for 168 files.
- `npm run engineering:check-secrets`: passed.
- `npm run validate:static`: passed, including formatting, lint, strict types, 436 tests across 71
  files and the production build.
- `git diff --check`: passed.
- Local Playwright was unavailable because the Chromium binary is not installed. Browser coverage
  remains required in GitHub Actions and the hosted Preview.

## Release declarations

- **Database migrations:** none.
- **Edge Functions:** none.
- **Supabase Auth configuration:** local recovery-template configuration added. The hosted Reset
  Password template must be updated only after the compatible application change is deployed.
- **New dependency or provider:** none.
- **Cost:** A$0/month and A$0/year.
- **Production access:** none.

## Rollback and follow-up

Revert the application commit to remove the new callback and onboarding behaviour. If the hosted
recovery template has already been updated, restore its previously approved content or forward-fix
it alongside the application so template and callback contracts remain compatible.

After merge and deployment, update the hosted Supabase **Reset Password** template to the reviewed
token-hash version. Verify with a synthetic account by requesting the reset in one browser, opening
the email through a different mobile browser, choosing a new password, and signing in with it.
