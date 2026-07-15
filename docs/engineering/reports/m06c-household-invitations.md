# Milestone 6C completion report

## 1. Status

Implemented, database validation pending

## 2. Baseline commit

Started from `main` at merge commit `24855c7`, containing accepted Milestone 6B, working authentication and onboarding, the Milestone 5 RLS foundation, and the permanent engineering standards. The working tree was clean.

## 3. Invitation implementation summary

Added seven-day, single-use household invitations with normalised duplicate prevention, hashed tokens, existing-member rejection, expiry, resend token rotation, cancellation, and verified-email acceptance. Delivery reuses Supabase Auth magic links over the configured Resend SMTP sender and existing `/auth/confirm` PKCE callback.

## 4. Member management implementation

The Settings route now shows active members and, for owners, invite controls and pending invitations. Owners can resend, cancel, and confirm removal in an accessible dialog. Removed members become inactive immediately. A partial unique index enforces one active household per account, and the final owner cannot be removed or demoted.

## 5. Security validation

Privileged functions are private security-definer implementations with empty `search_path`, fully qualified objects, `auth.uid()` identity, minimum grants, and security-invoker public wrappers. Acceptance compares the token's email with `auth.users.email`, forces the `member` role, and rejects cross-account, invalid, expired, reused, or already-household identities. Application roles never imply household access. Existing RLS helpers remain the final access boundary.

## 6. Tests executed

Application tests cover validation, owner controls, member read-only presentation, invitation acceptance, delivery callback construction, removal confirmation, and existing authentication/onboarding regressions. pgTAP adds owner/member/unrelated/inactive and adversarial invitation and membership coverage. Final command and CI results will be recorded after publication.

## 7. Validation results

- Clean install, formatting, lint, strict TypeScript, 51 tests, production build, database configuration, Markdown links, and whitespace checks: passed locally.
- Local database runtime: unavailable because Docker is not installed.
- `npm run test:e2e`: attempted locally; Playwright could not start because its Chromium executable is unavailable in this environment.
- Fresh reset, database lint, 30 new pgTAP assertions, security suite, generated types, Playwright, and axe: pending GitHub Actions.

## 8. Known limitations

Real provider delivery is not called by automated tests. Microsoft-hosted inboxes may delay or quarantine a message after Resend accepts it. Supabase Auth email rate limits apply. The production migration is not applied by this task. Multiple households, switching, role promotion, invitations without email authentication, and advanced administration are deliberately excluded.

No dependency or provider was added. Cost impact is A$0 beyond existing Supabase and Resend usage.

## 9. Git handover

Branch `m06c-household-invitations`. Commit and PR details will be added after final validation and publication.

## 10. Readiness for Milestone 7

Ready only after this PR passes the complete remote database/browser gates, is accepted, and its migration is released through the approved process. Milestone 7 has not begun.
