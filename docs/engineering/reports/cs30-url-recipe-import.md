# CS-30 Completion Report — URL Recipe Import

## Status

Implemented, validation pending. Local application checks pass; Docker-dependent database validation, generated database type freshness, hosted Edge Function behaviour and hosted preview testing remain for CI/Preview.

## Baseline and scope

- **Base:** `main` at `70bd741ad8056bdf77f61ff1de4ec408ae7a5bc5`
- **Branch:** `cs30-url-recipe-import`
- Adds review-before-save URL import with Public selected by default and an equally reachable Private choice.
- Extracts Schema.org Recipe JSON-LD, including author, publisher, ordered ingredients/instructions, yield, durations and image reference.
- Adds a separate platform recipe store without weakening household recipe RLS.
- Adds an authenticated Edge Function with URL, DNS target, redirect, timeout, content-type and response-size controls.

## Security and privacy

Public canonical recipes are readable by authenticated Cooksmith users and cannot be updated through normal user access. Private imports are readable and updateable only by their owner, including against other members of the same household. Duplicate public source URLs reuse the canonical record; duplicate private imports return a clear error.

The fetch boundary rejects credentials, non-web schemes, nonstandard ports, local/private/link-local/reserved/multicast IPv4 and IPv6 targets, rechecks DNS and redirects, limits redirects to three, times out after eight seconds, accepts HTML only and reads at most 1.5 MB. It forwards no page credentials. Hosted validation must confirm the Edge Runtime's DNS behaviour and outbound controls before release.

## Validation

- `npm ci --cache /tmp/cooksmith-npm-cache` — passed.
- `HOME=/tmp/cooksmith-home npm run preflight` — passed; the temporary home was required because the managed runner's `/root` is read-only.
- `npm run docs:commands:check` — passed across 104 files.
- Format, lint and strict type checks — passed after implementation fixes.
- Focused recipe schema, extraction and integration tests — passed after implementation fixes.
- Full Vitest suite — 29 files and 108 tests passed. One unrelated document-title timing assertion failed once during the first full run and passed on the immediate full rerun; no recipe test was involved.
- Production build — passed; Vite retained its existing large-chunk advisory.
- Docker database validation — unavailable locally because no Docker-compatible runtime is running.
- Generated database type freshness — pending CI; generated files were not hand-edited.
- Playwright — attempted, but the managed runner has no Chromium executable installed.
- GitHub Actions, Vercel preview and hosted Edge Function tests — pending.

## Release and operations

This PR does not deploy Production. After approved merge, release the exact accepted `main` SHA through the protected **Production database release** workflow, including dry-run and migration-history verification. The migration becomes immutable once shared; use a forward migration for fixes. Deploy the authenticated `import-recipe` Edge Function to the matching environment and verify its JWT requirement and outbound network behaviour before enabling hosted import.

Cost impact is **A$0 monthly / A$0 annually**. No dependency or paid extraction provider was added.
