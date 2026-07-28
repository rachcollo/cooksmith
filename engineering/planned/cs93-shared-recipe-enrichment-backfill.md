# Engineering Package — CS-93: Shared recipe enrichment and safe backfill

## Metadata

- **Milestone:** CS-93
- **Title:** Extend Recipe Intelligence to shared recipes and safe backfill
- **Jira issue:** [CS-93](https://smillins.atlassian.net/browse/CS-93)
- **Epic:** CS-5 — Recipe Library
- **Status:** `Ready`
- **Branch:** `feat/cs-93-shared-recipe-enrichment-backfill`
- **Depends on:** CS-90, CS-91, CS-62 and the accepted CS-81 weekly preparation contract
- **Blocks:** Production Recipe Intelligence backfill and representative CS-81/CS-91 evaluation
- **Package path:** `engineering/planned/cs93-shared-recipe-enrichment-backfill.md`
- **Verified baseline:** `main` at `1e79e82e8939b422348fd3d9a7bebe9506197d79`
- **Package date:** 2026-07-28

## Product Outcome

Cooksmith must enrich the recipes households actually use, including the shared platform recipes stored in `cooksmith.imported_recipes`. Today Recipe Intelligence supports only private `cooksmith.household_recipes`, so shared recipes cannot be enriched, backfilled or consumed by the weekly preparation path.

CS-93 extends the existing validated enrichment contract across both approved recipe sources without copying shared recipes into a household or weakening private-recipe isolation. An authorised administrator receives one protected, low-click operation to preview, start, pause, resume and verify an idempotent existing-recipe backfill. Recipe use and deterministic Get Ahead remain available throughout.

## Current Baseline

The package was verified against remote `main` commit `1e79e82e8939b422348fd3d9a7bebe9506197d79`, which includes merged CS-90 and CS-91.

- `household_recipes` is household-owned and protected by membership RLS.
- `imported_recipes` contains platform-public and user-owned private imports; only active platform-public rows are in CS-93 scope.
- `planned_meals` can reference either source through `recipe_id` or `imported_recipe_id`.
- CS-90 enrichment tables, queue RPC, triggers and worker currently support only `household_recipes`.
- CS-91 weekly preparation currently ignores `imported_recipe_id` and looks up enrichment only for the active household.
- `/admin` provides the accepted CS-62 protected operational pattern.
- Weekly-plan AI remains disabled until the accepted 30-plan evaluation is recorded and reviewed.

Production investigation identified 2 active household recipes and 19 active shared platform recipes, no enrichment jobs or completed enrichment, and 13 of 14 planned meals using shared recipes. These are operational observations, not fixtures or hard-coded eligibility counts.

## Scope

### Included

- Explicit source identity spanning household and shared platform recipes.
- Safe migration of existing household versions, jobs and results.
- Snapshot, trigger, queue, worker, activation and invalidation support for active public imported recipes.
- Mixed-source weekly preparation enrichment lookup.
- Protected admin preview, confirmed start, progress, pause/resume and bounded retry.
- Source-separated, privacy-safe evidence and cost reporting.
- RLS, generated types, pgTAP, application, browser and release coverage.

### Out of Scope

- Copying shared recipes into household storage.
- Enriching private imported recipes without a separately approved ownership model.
- Rewriting approved recipe content.
- Automatically enabling provider assistance or weekly preparation AI.
- Pantry merging, embeddings, vector search, chat or autonomous agents.
- Manual SQL or worker-token calls as the normal operator experience.

## Functional Requirements

### FR-1 — Explicit source identity

- [ ] Domain and database represent `household` and `shared_platform` as explicit constrained source kinds.
- [ ] Each version, job and result references exactly one valid source record and cannot reference both or neither.
- [ ] Existing household records migrate without changing semantic identity, result or audit history.
- [ ] Unique constraints and active-result indexes include complete source identity.
- [ ] Equal UUID values across the two source tables cannot collide or select the wrong result.

### FR-2 — Lossless source snapshots

- [ ] Household snapshots retain approved recipes and ordered structured child rows.
- [ ] Shared snapshots use active public `imported_recipes`, ordered `ingredient_rows` and `instruction_steps`, with stable references.
- [ ] Fingerprints include all material content and exclude non-semantic metadata.
- [ ] Enrichment never rewrites approved source content.
- [ ] Unknown data remains unknown; adapters invent no IDs, quantities, steps or safety facts.

### FR-3 — Automatic eligible-source queueing

- [ ] Household create/edit behaviour remains compatible with CS-90.
- [ ] Creating, publishing or materially editing an active public imported recipe queues its current snapshot.
- [ ] Archived or ineligible recipes do not queue and stale work cannot activate.
- [ ] Private imported recipes are excluded from the shared-platform path.
- [ ] Repeat trigger delivery is idempotent for source, fingerprint, schema, rules and model identity.

### FR-4 — Source-safe processing and activation

- [ ] Claims carry source kind and record identity through every load and update.
- [ ] Latest-version checks and activation are scoped to complete source identity.
- [ ] Activation atomically verifies job, source and current version.
- [ ] Shared active results are reusable across households without per-household copies.
- [ ] Household results remain visible only to their owning household.
- [ ] Disabled, timeout, invalid, stale, limited and internal-failure paths preserve valid output and recipe usability.
- [ ] Retry is bounded and permanent failures cannot loop indefinitely.

### FR-5 — Protected existing-recipe backfill

- [ ] A server-authorised preview returns eligible, current, queued and failed counts by source.
- [ ] Start requires confirmation and creates an audit event.
- [ ] The server derives recipes, household scope, status counts and batch scope; the browser supplies none as authority.
- [ ] Batches respect enqueue, emergency stop, daily usage, monthly cost and concurrency controls.
- [ ] Repeated start/resume is idempotent and cannot overwrite newer results.
- [ ] Pause stops new queue/claim work safely while bounded running leases resolve.
- [ ] Failed work can be retried safely by category and attempt policy.
- [ ] Partial failures remain visible without rolling back unrelated success.

### FR-6 — Calm admin progress experience

- [ ] Admin sees household/shared eligibility before starting.
- [ ] Progress shows queued, processing, completed, rejected, failed and skipped counts.
- [ ] Start, pause, resume and retry have clear labels, busy states and appropriate confirmation.
- [ ] Empty, partial, failed and stale-refresh states use calm Australian/UK English.
- [ ] Refresh is bounded, avoids duplicate operations and retains a manual option.
- [ ] No recipe content, provider response, secret or household-identifying detail is rendered.
- [ ] The section works on mobile and desktop without adding household Get Ahead steps.

### FR-7 — Weekly preparation consumes both sources

- [ ] Authenticated server loading includes both `recipe_id` and `imported_recipe_id`.
- [ ] Candidates retain source kind, source ID, exact version and traceability.
- [ ] Shared enrichment can contribute to multiple households' plans.
- [ ] Household enrichment cannot be requested or inferred by another household.
- [ ] Mixed-source weeks resolve correctly even with equal UUIDs.
- [ ] Missing or invalid enrichment preserves deterministic Get Ahead and non-technical copy.
- [ ] Opening Get Ahead does not trigger enrichment or backfill.

### FR-8 — Evidence and release gate

- [ ] Aggregate evidence includes source counts, failure categories, latency, token use and estimated A$ cost.
- [ ] Logs exclude recipe text, prompts, provider responses, secrets and unnecessary user/household IDs.
- [ ] Backfill completion changes neither Recipe Intelligence AI nor weekly preparation AI settings.
- [ ] The CS-81 30-plan evaluation remains mandatory before weekly-plan AI enablement.
- [ ] Runbook stop conditions cover unsafe output, unexpected cost, repeated failure, stale results and isolation defects.

## Data and Domain Direction

Use a database-enforced dual-reference design unless validation proves a stronger alternative:

- add a constrained source-kind value;
- retain a nullable household-recipe foreign key and add a nullable imported-recipe foreign key;
- enforce exactly one reference consistent with source kind;
- require `household_id` for household sources and null it for shared-platform sources;
- scope fingerprints, jobs, current versions and active results to full source identity;
- restrict shared sources to active `visibility = 'public'` rows; and
- preserve household records through expand/backfill/validate migration steps.

Do not replace real foreign keys with an unconstrained generic UUID. The migration is additive and forward-only. Existing CS-90 code must remain compatible through the deployment window.

## Trusted Boundary and UX

- Reuse the CS-62 application-admin role and server-authorised repository pattern.
- Add a narrow protected server boundary for `preview`, `start`, `pause`, `resume`, `retry_failed` and `status`.
- Verify admin authority server-side on every request and derive rows, eligibility and limits there.
- Never expose service-role keys, provider keys or worker tokens.
- Prefer atomic database functions with minimum grants and fully qualified objects.
- Add a focused **Recipe enrichment** section to `/admin` with one confirmed **Enrich existing recipes** action.
- Use accessible 44px controls, visible focus, associated status/error text, bounded live announcements and predictable focus return.
- Poll only while active, stop when hidden/unmounted and retain manual refresh.

## Security and Privacy

- [ ] RLS remains the final boundary for household enrichment.
- [ ] Public recipe readability grants no mutation or operational privilege.
- [ ] Admin access does not expose private recipe content.
- [ ] Tests cover admin, ordinary member, unrelated/inactive user and unauthenticated contexts.
- [ ] Tests cover identifier substitution across source, recipe, version, job and household IDs.
- [ ] Browser responses contain aggregates and safe failure categories only.
- [ ] No production content or identifiers enter fixtures, logs, screenshots or reports.
- [ ] Provider and worker secrets remain server-only and secret scanning stays green.

## Expected Change Surface

- New forward migration under `supabase/migrations/`.
- `supabase/functions/enrich-recipe/index.ts` and tests.
- `supabase/functions/get-weekly-preparation-plan/index.ts` and tests.
- A protected admin operations Edge Function or accepted existing boundary.
- Recipe intelligence domain contract and admin repository/adapter/context.
- `src/routes/AdminPage.tsx` and scoped styles.
- Generated database types.
- Existing CS-90 pgTAP plus a new CS-93 database/security suite.
- Recipe Intelligence documentation, policy/operations material, report and handover.
- Protected Edge Function release workflow if the deployed set changes.

## Test Plan

### Unit and integration

- [ ] Source parsing and exactly-one-reference validation.
- [ ] Household/shared snapshot adapters and stable child references.
- [ ] Material versus non-material fingerprint changes and UUID collision safety.
- [ ] Both source triggers queue exactly once; private/archived imports remain ineligible.
- [ ] Worker claims, validates and activates each source kind.
- [ ] Stale, failed, disabled, limited and retry paths preserve current valid output.
- [ ] Backfill preview/start derive eligibility server-side and repeated start/resume is idempotent.
- [ ] Pause, lease expiry, bounded retry and partial failures behave safely.
- [ ] Admin commands deny forged scope, non-admin and unauthenticated callers.
- [ ] Weekly preparation consumes shared enrichment and preserves deterministic fallback.

### Database and RLS

- [ ] Migration preserves household versions, jobs and results.
- [ ] Exactly-one source, kind consistency, household-nullability and foreign-key behaviour are enforced.
- [ ] Version/job/result uniqueness and active-result rules work for both sources and equal UUIDs.
- [ ] Public/private/archived trigger eligibility is correct.
- [ ] Worker access is service-role-only and browser roles are denied.
- [ ] Household access and unrelated/inactive denial remain correct.
- [ ] Shared reuse does not leak household data.
- [ ] Admin aggregates reveal no recipe content.
- [ ] API allowlists, policies, functions and generated types are current.

### Preview journey

1. Create synthetic household and public shared recipes in Preview.
2. Preview eligibility and confirm backfill as admin.
3. Observe bounded progress, pause/resume and retry a synthetic failure.
4. Plan a mixed-source week and verify enriched Get Ahead guidance.
5. Verify an unenriched recipe still gets deterministic guidance.
6. Verify ordinary users cannot access admin operations.
7. Verify mobile, desktop, keyboard, focus, live-region and overflow behaviour.

Production data is not valid Preview evidence.

## Quality Gates

- [ ] `npm run preflight`
- [ ] `npm ci`
- [ ] `npm run format:check`
- [ ] `npm run docs:commands:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run db:config:check`
- [ ] Local Supabase reset, lint, pgTAP/RLS/security and generated-type freshness
- [ ] Relevant Playwright, axe and responsive coverage
- [ ] Secret, dependency and whitespace checks
- [ ] PR governance validator
- [ ] Hosted Preview journey with synthetic data
- [ ] Hosted provider/evaluation evidence recorded separately
- [ ] No Production access or deployment during implementation

Unavailable Docker, browser or hosted gates must be recorded honestly, not claimed as passed.

## Release and Backfill Plan

This package PR contains no migration, Edge Function or Production deployment. After implementation is accepted:

1. Release the exact approved `main` SHA through the protected database workflow.
2. Verify migration history; use forward migrations for corrections.
3. Deploy changed Edge Functions from the same SHA.
4. Deploy and verify the application.
5. Keep Recipe Intelligence provider assistance and weekly-plan AI disabled.
6. Preview current household/shared counts in `/admin` and investigate unexpected differences.
7. Confirm bounded backfill and monitor failures, latency, tokens and A$ cost.
8. Pause on unsafe output, isolation concerns, runaway retry or unexpected spend.
9. Verify active enrichment for both sources and the normal mixed-source Get Ahead path.
10. Complete and review the 30-plan evaluation before enabling weekly-plan AI.

Backfill execution affects Production records and provider spend and requires separate explicit operator action after deployment. Merge must not start it automatically.

## Rollback and Recovery

- Activate emergency stop to prevent new claims and queueing.
- Disable enqueueing if trigger-created work must stop.
- Preserve recipes, versions, jobs, results and audit rows; do not delete evidence.
- Revert application/function routing where safe and use forward migrations for schema corrections.
- Deterministic Get Ahead remains available.
- Resume only after understanding fault category, isolation and cost impact.

## Cost and Dependency Impact

- Package PR: A$0/month and A$0/year; documentation only.
- No new dependency or paid service is approved.
- Deterministic enrichment has A$0 provider cost.
- Provider-assisted backfill uses existing approved OpenAI/server budgets and must report measured A$ cost.

## Definition of Done

- [ ] All Jira and package criteria are met.
- [ ] Both sources have database-enforced identity and access rules.
- [ ] Existing household enrichment evidence migrates safely.
- [ ] Admin backfill is confirmed, resumable, bounded, idempotent and auditable.
- [ ] Mixed-source Get Ahead works and deterministic fallback remains intact.
- [ ] Database, security, application and browser coverage passes.
- [ ] Preview is validated with synthetic data.
- [ ] Documentation, generated types, report and handover are current.
- [ ] Implementation PR targets `main`, passes checks and is reviewed.
- [ ] Jira and package move through the AIEOS lifecycle.

## PR Requirements

Package PR title: `chore(package): CS-93 — shared recipe enrichment and safe backfill`

Implementation PR title: `CS-93: Extend Recipe Intelligence to shared recipes and safe backfill`

Both PRs must link [CS-93](https://smillins.atlassian.net/browse/CS-93). The package PR is documentation-only and declares **Migration: no** and **Edge Functions: no**. The implementation PR must list every migration and Edge Function, baseline, changed files, RLS evidence, test/Preview evidence, unrun checks, cost, deployment order, backfill authorisation, rollback and limitations.