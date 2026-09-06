# CS-92 handover: Cross-browser password recovery

## Delivery

- **Jira issue:** CS-92
- **Branch:** `fix/cs-92-password-recovery`
- **Base branch:** `main`
- **Migration:** none
- **Edge Function:** none
- **Recurring cost:** A$0

## What changes

Password reset emails use a one-time token hash instead of a browser-local PKCE verifier. The app
accepts `type=recovery` only on `/auth/reset-password`, verifies the token through Supabase, removes
the secret from browser history, and opens the password form with the authenticated recovery
session. Expired or reused links offer a new password reset email rather than a generic magic link.

Reset requests keep account existence private with neutral copy. The final onboarding screen also
offers **Set password and enter Cooksmith** or **Skip for now**.

## Hosted Supabase action after deployment

Update the **Reset Password** template in the hosted Supabase Auth dashboard to the content in
`supabase/templates/recovery.html`. Its button must resolve to:

```html
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery
```

Do not publish that template before the compatible application commit is deployed. No Site URL,
redirect allow-list, SMTP provider, key, secret or database setting needs to change.

## Verification

Local preflight, Auth configuration validation, documentation audit, secret scan, formatting, lint,
strict types, 436 Vitest tests and production build passed. Focused regression coverage proves
cross-browser recovery verification, wrong-route type rejection, callback cleanup, neutral reset
copy, password-specific errors, optional password creation and skipping the optional step.

Local Playwright could not run because Chromium is unavailable. Require GitHub Actions and Preview
to pass, then complete a physical-device check:

1. Request a password reset using a synthetic account.
2. Open the email in Gmail or Outlook and hand it off to Safari.
3. Confirm **Choose a new password** opens directly without the generic sign-in error.
4. Save a compliant password and confirm the app opens.
5. Sign out and sign in using the new password.
6. Reopen the used link and confirm the password-specific recovery message and fresh-reset action.
7. Submit an unregistered synthetic address and confirm the same neutral **Check your email** state
   appears, without an account-not-found disclosure.

## Safety and rollback

No callback value, email address, password or provider detail is logged or committed. Supabase
remains the identity authority, and this change does not alter household access or RLS. If rollback
is required after the hosted template changes, keep the deployed callback and template contracts
compatible rather than leaving newly issued recovery links unusable.
