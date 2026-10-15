# CS-103 Luna useful small preparation

Status: Implemented, validation pending. Baseline main `f9e76c3f47e1f893545540f25f6dc02d7b4dd3fc`; branch `fix/cs-103-luna-prep-quality`.

## Findings

The hosted v1 run scored 23/30, below the unchanged 28 threshold. All 28 model outputs passed validation; no fallback or unsupported output. Cases 3/14/25 (aromatics), 9/20 (fresh finishers) and 22 (mixed textures) persisted empty plans; case 11 covered onion but omitted cucumber. Persisted evidence contains validated tasks, not the complete raw response, so exact model reasoning cannot be reconstructed. Conservative prompt interpretation is a hypothesis supported by the wording, not a proven provider diagnosis.

The existing prompt explicitly rejects tiny handling, prefers high-value cooked components and permits empty results. The Luna-only clarification distinguishes source-backed aromatic/herb/vegetable preparation from trivial handling; assesses realistic grouped tasks including shared setup/cleanup; separates canonical advance-prep actions from later serving/finishing instructions; checks remaining useful meal coverage. It explicitly forbids invented quantity, padding duration, unsafe grouping or overriding storage/eligibility. No domain validator, corpus, quality threshold, token limit or reasoning setting is changed. Mocked adapter-to-validator regressions prove compatible realistic decisions can pass, not that Luna will produce them.

Profile becomes `weekly-preparation-strategy-v13-luna-low-v2`. New migration `20261015212702_weekly_preparation_luna_quality_profile.sql` replaces only the fixed admin command target. Migration deployment does not mutate settings. The existing real-admin action requires both AI flags disabled, rejects active jobs/evaluations, records before/after metadata and clears stale smoke. v1 is rejected by the new weekly profile guard; legacy non-Luna requests retain their original prompt. Pricing/model/corpus stay unchanged.

## Separate recipe coverage blocker

Read-only production diagnosis: evaluation queue readiness is true; full recipe coverage readiness is false. Of 57 latest source versions, 47 lack qualifying rules-v4 coverage: 45 public recipes and 2 other-household recipes. Their observed jobs use older rule versions. The 2 isolated beta recipes have current coverage. Remaining public sources comprise 5 with qualifying enrichment and 3 additional terminal unsupported resolutions. No source text or real-household identifiers are copied here.

The global activation gate requires current `recipe-intelligence-v3` / `cooksmith-rules-v4` source-linked opportunity evidence or current terminal unsupported resolution, with no pending/processing current jobs. The evaluation-only readiness RPC checks the queue is settled. These are intentionally different checks. The rules-v4 structure migration explains why older completed jobs do not establish current coverage. No backfill, data relabelling, bypass or gate change was performed. Resolving the 47-source coverage gap requires a separate approved recovery scope before activation, even if v2 passes evaluation.

## Release and verification

Owner retains merge and protected database/Edge releases at the exact approved main SHA; database dry-run/history verification mandatory. Released migrations immutable; forward fixes only. Both features remain disabled through deployment and real-admin Prepare Luna profile. Verify v2 and audit before any new run. Fresh hosted evaluation/acceptance, Luna enrichment provenance and isolated-household generation/persistence/mobile/cache remain unperformed. Existing acceptance criteria are unchanged. Do not retry the failed v1 run or silently accept it.

No production mutations or paid calls during this correction. Prior total test spend A$0.016612 of A$2. No new dependencies; fixed incremental A$0/month and A$0/year. Prompt editing UI and bulk Pantry remain separate backlog work. Automated results and CI publication evidence are recorded in the PR; no hosted preview/provider success is claimed.

## Offline evidence

The targeted adapter/profile/validator suite passed 25 tests. Fresh isolated database reset, lint and type freshness passed; full pgTAP passed 714 assertions in 41 files, including five new v1-to-v2 transition checks and the existing 28 access/audit/activation checks. No database API signature change; regenerated type comparison remains identical. Full static suite and CI results are recorded in the PR. Browser suites are unchanged and will run in CI; local WebKit remains unavailable from the previously documented missing host libraries.

A zero-provider-call capture of the revised fixed evaluation produced 28 requests: 226,826 total request bytes, 9,794 maximum, 229,376 maximum output tokens. Conservatively reserving all request bytes plus 4,096 tokens per request gives 341,514 input tokens and A$0.23814304 at the recorded A$0.16/A$0.80 rates. The existing A$0.60 one-run reservation still accommodates that estimate with margin, conditional on the same tier/rate assumptions. This is not an invoice or authority to invoke now. No automatic retries; reconcile any unknown usage before another call.
