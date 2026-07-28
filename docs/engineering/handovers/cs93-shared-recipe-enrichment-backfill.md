# CS-93 handover — shared recipe enrichment and safe backfill

## Outcome

Recipe Intelligence now has database-enforced source identity for household
and active public shared recipes. The worker and Get Ahead path resolve the
exact source/version, while `/admin` provides protected preview, start,
pause/resume, retry and progress controls. Start, resume and retry initiate a
server-side worker chain that drains eligible queued jobs one at a time.

## Release order

1. Merge only after quality, database and Preview checks pass.
2. Release migration `20260728150000_shared_recipe_enrichment_backfill.sql`
   through the protected Production database workflow for the approved
   40-character `main` SHA.
3. Deploy `enrich-recipe` and `get-weekly-preparation-plan` from that SHA.
4. Verify the application deployment. Keep Recipe Intelligence provider
   assistance and weekly-plan AI disabled.
5. In `/admin`, confirm the source-separated preview is reasonable, then
   separately authorise **Enrich existing recipes**.
6. Monitor queue state, failures, latency, token use and estimated A$ cost.
   Pause on unexpected cost, repeated failures, stale activation or any
   isolation concern.
7. Verify a synthetic mixed-source plan and deterministic fallback.

## Recovery

Pause enrichment or activate the existing emergency stop. Preserve versions,
jobs, results and audit evidence. Roll application/functions back where safe
and correct schema defects with a new forward migration. Never edit or delete
Production recipe rows to recover the backfill.

## Validation

Local TypeScript, lint, unit/integration, build, documentation and database
configuration checks passed. Docker/local Supabase and hosted Preview were not
available in the implementation workspace and remain required CI/review
evidence. No Production system or data was accessed.

## Cost and security

No dependency or baseline recurring cost was added. Provider-assisted work
uses the existing approved budget and remains disabled unless separately
enabled. Browser responses contain aggregate counts only; provider and worker
secrets remain server-side.
