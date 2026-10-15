# CS-103 profile transition handover

Status: Implemented, validation pending.

Baseline: main `3f2156cd28a5d8e38593894b4febe1949a559e6c`. Branch: `fix/cs-103-profile-transition`.

The owner could pause AI but had no authorised control for changing the database profile. Existing column grants prohibit direct profile writes; evaluation correctly rejects the old prompt with the Luna environment model. The new confirmed admin action calls a fixed-purpose RPC. Its private implementation checks the caller's application role, requires both AI flags disabled and corpus v13, rejects active evaluation/enrichment, locks settings, applies the approved identity and records before/after metadata. No identity is impersonated, column grants are not widened, and existing activation gates remain. Duplicate calls preserve fresh evidence. The admin evaluation panel filters to current profile identity rather than presenting legacy acceptance as current readiness.

Migration: `20261015203538_weekly_preparation_luna_profile_transition.sql`. New RLS-protected audit table, private function and invoker wrapper; generated types updated from local database. No new dependencies or Edge changes. No household records changed.

Validation results will be recorded after execution. Local mocked/UI and PostgreSQL evidence does not establish hosted provider quality. Hosted preview/action, actual owner-authenticated transition, fresh Luna evaluation/acceptance and isolated household persistence/mobile/cache checks remain pending.

Release only after owner review/merge: protected Production database release at exact approved main SHA, dry-run and migration-history verification mandatory. PR itself does not deploy Production. Additive migration does not change existing settings on deployment. Never reset or seed hosted projects. After migration/frontend release, confirm both AI flags disabled and work drained; owner confirms Prepare Luna profile; verify audit/profile/smoke readback before any paid evaluation. Environment model/rate settings are separate and already coordinated. No automatic evaluation, activation, re-enrichment or rollback to guessed rates. On failure keep features disabled and investigate; use a forward migration for released SQL fixes.

Fixed cost A$0/month and A$0/year; no paid calls in implementation. Preserve existing A$2 total hosted-test cap and reconcile earlier usage before new calls. Provider secrets are never browser-visible. Accessibility uses existing semantic Button, confirmation and live status patterns; physical-device/assistive-technology validation remains unperformed.

## Validation evidence

- `npm ci`, environment preflight, package readiness (6 criteria), docs command audit (197 files), database configuration (72 migrations), secret scan and production dependency audit passed. Existing reviewed React Router non-RSC audit exception unchanged.
- Fresh isolated local database reset, SQL lint, generated types and type freshness passed. Full pgTAP: **709 tests in 40 files**, including **28 new transition/security tests**. API contract allowlists were updated to explicitly include the new admin-read-only audit table; existing checks remain.
- Application suite: **690 tests in 95 files**, including four new UI cases and three repository cases. Final formatting, lint, TypeScript, application tests and production build all passed.
- Local Playwright: **48 passed, 10 failed to launch WebKit, 2 existing skips**. Missing host libraries: GTK4, Graphene, Harfbuzz ICU, Manette, Hyphen, WOFF2 and GLESv2. Chromium flows passed; CI's installed WebKit dependencies must provide the remaining browser evidence. No hosted browser check was performed.
- Initial local checks exposed the expected missing generated RPC type, both explicit table-contract inventories needing the new table, and an invalid synthetic evaluation completion fixture. Corrected these before final checks; no production constraints or tests were weakened.
- Full and reduced Docker startup initially exhausted disk under this runner's `vfs` driver. Local testing then used a flattened official `public.ecr.aws/supabase/postgres:17.6.1.143` filesystem with original runtime configuration (upstream digest `sha256:80d7b27c3e8d77cfa7226eee9508671796da214781ff15a35b3670d7ad5ee453`), avoiding copied layers. No repository/runtime configuration was changed; CI uses its normal stack.

CI, preview and publication evidence will be recorded in the PR. Production remains disabled and unchanged by this implementation. No model calls or paid evaluations were made.
