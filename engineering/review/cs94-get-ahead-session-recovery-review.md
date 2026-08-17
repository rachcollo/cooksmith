# CS-94 Get Ahead browser session recovery review

## Status

Implemented for review.

## Baseline

- Branch: `main`
- Commit: `e25c496f6532efb7f0944232d2e48fb6bfbbf613`

## Root cause

Get Ahead read its local-storage snapshot with `JSON.parse` and a TypeScript assertion. Runtime
data from an earlier release could therefore enter the current render path without validation.
Nested checklist fields added after the original session version were then treated as guaranteed,
allowing a browser-only route render failure while the persisted server plan remained valid.

The reference displayed by the route failure was written only to the browser console. It was not
attached to the Sentry exception, so operators could not use the reference to retrieve the stack.

## Changes

- Advanced the persisted Get Ahead session identity to v2.
- Added fail-closed runtime restoration for saved sessions.
- Automatically removes obsolete, malformed or incomplete snapshots so the current plan rebuilds.
- Tightened nested weekly preparation plan validation at the Supabase repository boundary.
- Added defensive recipe attribution in expanded checklist details.
- Captures route failures in Sentry with a stable displayed correlation reference.
- Added unit and integration regression coverage.

## Release declarations

- Migrations in this PR: no.
- Edge Functions changed in this PR: no.
- Dependencies changed in this PR: no.
- Production configuration changed in this PR: no.
- Fixed cost impact: A$0/month and A$0/year.

## Validation

Connector-authored changes require GitHub Actions to run the full repository quality suite.
The PR must remain draft until format, lint, typecheck, tests, build, browser smoke and governance
checks complete. Hosted preview should verify that an existing device can reopen Get Ahead,
automatically recover, start a session, expand **Show what to do**, and return home without the
route failure screen.
