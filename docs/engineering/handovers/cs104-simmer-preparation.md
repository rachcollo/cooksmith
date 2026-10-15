# CS-104 handover: simmer preparation orchestration

- **Date:** 2026-10-15
- **Branch:** `fix/cs-104-simmer-preparation`
- **Target/baseline:** `main`, `d8d87c0628165eea27927e5a07daa77a2f4b07de`
- **Status:** Implemented, validation pending
- **Package:** `engineering/ready/cs104-simmer-preparation.md`

## Outcome

Production enriched a synthetic simmered sauce correctly, but the household wrapper excluded its action before weekly generation and returned a misleading timing message. The weekly domain and enrichment already support simmer. The wrapper now uses the existing shared weekly safe-action list, preventing that duplicate list from drifting.

## Changes and validation

Only the household Edge wrapper changes behaviour. Four tests invoke the real registered request handler with mocked HTTP boundaries: simmer forwarding and worker response, unsupported action, insufficient storage window, and unrelated household. They preserve source references and verify downstream domain eligibility. The former omission fails the positive regression; fixed code passes all four. These are offline boundary tests, not provider or Deno-hosted acceptance.

Local npm ci, preflight, format/check, lint, TypeScript, full unit/integration suite and production build passed. Package readiness, database configuration (71 migrations), documentation commands (196 files), secret scan and production dependency audit passed (existing reviewed non-RSC React Router exception). CI pending publication. The initial typecheck identified the new Edge entrypoint missing from the composite test include list; corrected. An initial lint run overlapped dependency reinstall and lost its formatter; after npm ci completed, the full clean validation passed. Browser/database runtime suites were not rerun for this server-only change; no schema or UI change. Four actual-handler regressions cover the changed boundary.

## Hosted verification and limitations

No new hosted function or production configuration deployed in this task. Frontend preview cannot prove Edge correction. After approved merge and protected function release, use the retained synthetic sauce in the beta household, schedule within48hours, and verify enrichment→household wrapper→weekly model→validation→persistence→mobile instructions→cache reopening. Existing enrichment can be reused; no catalogue processing. Luna acceptance remains separate and must use the exact deployed identity.

## Security, accessibility and costs

Membership/RLS and source/storage checks retained. No UI changes, schema migrations, credentials, provider changes or paid calls. Fixed incremental A$0/month and A$0/year. Hosted requests use the already-approved A$2 total test cap. Unrelated enrichment wake-up, telemetry and quick-add bugs remain CS-105/106/107.

## Recovery

Revert this wrapper change through a reviewed release if needed; it has no data migration or cleanup requirement. Keep the original model configuration for emergency recovery, but do not undo a successful owner-approved Luna migration merely because the superseded trial proposal required restoration.
