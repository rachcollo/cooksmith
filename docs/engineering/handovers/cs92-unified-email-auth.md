# CS-92 handover: Unified email authentication

- **Date:** 2026-09-03
- **Branch:** `feat/cs-92-unified-email-auth`
- **Target:** `main`
- **Baseline:** `44975b34419ea860d3194bab35363ede270fa8db`
- **Status:** Ready for review after required CI

## Product impact

One calm email action now works for both returning and first-time users. Cross-browser email opening uses token-hash verification, removing the Outlook-to-Safari PKCE verifier trap. Password sign-in and password account creation remain available.

## Changes made

- Enabled supported account creation for email OTP requests with neutral confirmation copy.
- Added token-hash parsing and `verifyOtp()` session establishment.
- Kept bounded legacy-code compatibility and rejected ambiguous callback contracts.
- Sanitised callback history, strengthened safe-return validation and added privacy-safe outcome telemetry.
- Added local confirmation and magic-link templates plus regression coverage.
- Confirmed existing profile, household and membership constraints make onboarding provisioning idempotent.

## Release declarations

- **Migrations in this PR:** None.
- **Edge Functions changed in this PR:** None.
- **Supabase configuration:** Local template configuration and template source files changed. Hosted templates must be updated only after the compatible application callback is deployed.
- **Dependencies:** None.
- **Recurring cost:** A$0/month and A$0/year.

## Verification remaining

GitHub Actions and Vercel Preview must pass. Then verify a returning synthetic user and a genuinely new synthetic user in same-browser and Outlook/in-app-email-to-Safari flows. Confirm the link uses the token-hash callback shape, the URL is cleaned, complete users reach the application and incomplete users reach onboarding. Hosted Production configuration has not been changed by this PR.

## Rollback

Revert the application change. If hosted templates have already been switched, restore their previous content at the same time so callback and email contracts remain compatible.
