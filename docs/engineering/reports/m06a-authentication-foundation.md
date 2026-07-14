# Milestone 6A completion report

## 1. Status

Implemented, SMTP configuration pending

## 2. Baseline commit

Started from merged `v2` commit `ed9ebe6cc72cd08b09f8c54ecfdfc68ca69906f5`. Milestone 5 and the engineering standards were present; the working tree was clean.

## 3. Authentication components

Typed Supabase browser client, central `AuthProvider`, current-user/session hook, validated restoration, refresh, logout, PKCE callback detection, protected-route and public-only guards, and strict same-origin return-path handling.

## 4. Screens implemented

Welcome, password sign-in, create account, magic link, forgot password, reset password, and email confirmation, with accessible loading, success, and error states. Profile and household onboarding are absent by design.

## 5. Resend configuration

The safe SMTP runbook specifies `smtp.resend.com`, TLS port 465, username `resend`, and sender `Cooksmith <hello@smillins.com.au>`. The SMTP password remains unconfigured and outside Git. Invitation email is excluded.

## 6. Environment variables

No new secret-bearing browser variables were added. The implementation uses the existing environment-specific Supabase URL and publishable key. Preview/Production redirect and SMTP configuration is documented in `docs/engineering/v2/authentication.md`.

## 7. Tests executed

Coverage includes protected/public routes, redirect manipulation, existing component/integration/database contracts, and a 12-check browser accessibility/responsive suite wired for CI.

## 8. Validation results

- `npm run format:check`: passed
- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: passed, 37 tests
- `npm run build`: passed
- `npm run db:config:check`: passed
- `git diff --check` and secrets scan: passed
- `npm run test:e2e`: local Chromium download was blocked/truncated
- GitHub Actions isolated Supabase validation: passed, including migrations, database lint, pgTAP/RLS security tests, and generated-type freshness
- GitHub Actions Playwright suite: passed, 12 desktop/mobile auth, responsive, redirect, and axe checks

## 9. Known limitations

Hosted Resend SMTP credentials, verified-domain delivery, exact hosted redirect URLs, and real inbox delivery require environment-owner configuration. The local runtime could not install Chromium, so browser and axe results depend on the existing CI runner. No manual authentication bypass exists.

The only added dependency is exact-pinned `@supabase/supabase-js@2.110.5`. It uses the approved Supabase provider and adds no new paid service; Resend remains within the approved architecture and its credentials are not provisioned by this PR.

## 10. Git handover

Branch `m06a-authentication-foundation`. Commit and PR details are added after validation and publication.

## 11. Readiness for Milestone 6B

Ready for Milestone 6B after this PR is accepted and hosted SMTP/redirect configuration is completed. Milestone 6B has not begun.
