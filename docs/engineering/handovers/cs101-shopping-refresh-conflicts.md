# CS-101 handover: bounded stale Shopping refresh conflicts

- Date: 2026-10-06
- Branch: `fix/cs-101-shopping-refresh-conflicts`
- Baseline: accepted main `b2fb576ebce250e325df297670d62df18c523339`
- Status: correction implemented; draft review, hosted/manual acceptance pending
- Jira: [CS-101](https://smillins.atlassian.net/browse/CS-101)

## Problem and correction

An ordinary stale Shopping source snapshot should reject the refresh and let the household reload. Instead, each deliberate `40001` exception caused local PostgREST 14.5 to retry indefinitely. Changed meal/source, changed recipe version and changed contributions each timed out at the harness's four-second bound (4,004 / 4,001 / 4,001 ms). The same cause affected freezer PR192. SQL-only assertions caught the exception but could not detect HTTP retries.

[Supabase's troubleshooting guidance](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b) identifies this PostgREST 14 behaviour and recommends `PT409` for deliberate conflicts; the retry defect is addressed in PostgREST 16. This correction works with the current tested 14.5 runtime without assuming a hosted runtime upgrade.

**Migrations in this PR: yes.** Additive forward migration `20261006023153_shopping_refresh_http_conflicts.sql` replaces only the three error codes in `cooksmith.refresh_shopping_ingredient_structure(uuid,jsonb)`, asserting the expected guard count. Function conditions, security-invoker attributes, grants, household checks, locks, source comparisons and transactional reconciliation remain intact. Released migration `20261005015715_shared_ingredient_structure.sql` is unchanged. **Edge Functions changed in this PR: no.** No dependencies, environment settings, recurring fees or production data changed.

The existing UI already says to reload and retry while preserving household edits. A rejected refresh does not transparently reload and overwrite newer work. The database returns the original specific conflict message with HTTP 409. Genuine database serialization errors retain their runtime semantics; this migration only changes explicit application conflicts in the identified function.

## Verification

- `scripts/http/shopping-refresh-conflicts.test.mjs` runs over authenticated HTTP against seeded local Supabase, with a four-second abort bound and local-host-only connection guard. It verifies all three 409/PT409 responses, unchanged purchase/source snapshots, rollback when a later batch fails, preserved bought state, successful fresh retry and unrelated-household denial.
- `.github/workflows/v2-quality.yml` runs all `scripts/http/*.test.mjs` after database SQL tests. This same CI step/helper is also present on PR192, so the combined tree runs both regressions.
- Updated pgTAP assertions expect PT409. Standalone full migration replay: **521 assertions / 32 files**. Database lint/security advisors pass; freshly generated types match without generated-file changes.
- Standalone full static passes: **586 Vitest checks / 77 files**, formatting, lint, types and production build; **28 Chromium/mobile browser checks** pass. Preflight, docs, secrets, audit and database config pass. Final exact-head CI is linked in the draft PR. No hosted authenticated, Firefox/Safari, physical-device or assistive-technology acceptance is claimed.
- Evidence: `/tmp/cooksmith-review/conflict-cs101-three-before.log`, `conflict-cs101-{http,static,browser,db,lint,advisors,preflight,docs,secrets,audit,config}.log`.

## Combined integration and review order

Combined tree includes PR189 `e67d571`, PR190 `b1b0a3b`, PR191 `36ce745`, updated PR192, PR193 `0f01920` and this correction. All feature overlaps from the previous review remain resolved; these correction deltas add two migrations, two HTTP tests, one identical CI step/helper, the freezer adapter mapping and recovery test. No correction changes Shopping put-away, period semantics or ingredient interpretation. Combined verification passes **612 Vitest checks / 84 files, 38 browser checks, 638 SQL assertions / 36 files, 45 existing API checks and both HTTP regressions**; lint/advisors and regenerated types pass. The existing CS-101 lifecycle harness also passes **18/18** after its own clean synthetic reset. Its first run after unrelated feature fixtures failed two global count/quantity assumptions; the isolated rerun confirms fixture contamination rather than a product regression. Full combined evidence is under `/tmp/cooksmith-review/conflict-combined-*`.

Review this standalone released-code correction first, then feature code **PR189 → PR190 → PR191 → PR192 → PR193** (PR192 is stacked on PR189). No merge/deployment is performed or authorised by this handover. For a later approved full-set release, merge the selected code first and perform one protected database release in chronological migration order: `20261005111000`, `20261006010046`, `20261006012145`, `20261006015319`, `20261006023152`, `20261006023153`; then compatible client code. Check remote history and dry-run output so a newer correction cannot hide older pending feature migrations. An early independent Shopping-only release needs a separately approved ordering plan for those older migrations; do not rewrite migration history.

## Rollback, operational limits and remaining acceptance

Keep migrations and forward-fix; reverting to `40001` reintroduces the retry problem. Retain all concurrency protections. Replacing the function does not stop already-looping requests: a production incident response must separately identify affected sessions and obtain approval for intervention. Only synthetic local PostgREST was restarted during reproduction. No production inspection, termination, release, paid calls or further MVP feature work occurred.

Jira remains In Review. PR193 being ready for review is not beta acceptance. Authenticated hosted journeys, real browser/device acceptance and the wider release-readiness conditions remain separate gates even after this correction's exact-head CI passes.
