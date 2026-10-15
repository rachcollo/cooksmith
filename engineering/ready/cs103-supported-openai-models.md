# CS-103 — Supported OpenAI model migration

- **Jira issue:** [CS-103](https://smillins.atlassian.net/browse/CS-103)
- **Status:** Ready
- **Branch:** `feat/cs-103-supported-openai-models`
- **Baseline:** `main` at `a2d08425edd7d28aec15a8d64f8e688b921e0ee5`
- **Depends on:** delivered CS-90/93 recipe intelligence and CS-81/94 weekly planning
- **Blocks:** long-term provider continuity; hosted acceptance remains a release gate

## Product outcome

Keep recipe intelligence and Get Ahead working through API retirements, without adding household effort or a second interpretation pipeline. Preserve source validation, existing recipes and honest unavailable states (accepted ADR012/013).

## Scope and technical direction

Use `gpt-6-luna` as the proposed shared candidate through the existing Responses API. Add a shared server-side request profile with explicit low reasoning and bounded output, completed-response validation and a weekly prompt/profile identity gate. Preserve legacy configured requests for staged comparison and rollback before retirement; remove the retiring enrichment default. Retain strict JSON schemas, existing source-reference validation, timeouts, queue limits, model/environment consistency checks and activation gates.

Import remains deterministic and queues enrichment on save. Existing validated enrichments remain reusable and retain provenance: no bulk backfill, job-identity rewrite, schema migration or automatic activation. No new provider, dependencies, user-facing controls, model credentials or auth/RLS changes.

## Acceptance criteria

- [ ] Inventory current code, deployed sources and accessible settings; state unverified secret overrides and project permissions explicitly.
- [ ] Both adapters and evaluation use compatible shared Responses options; no unsupported sampling or Chat Completions token parameters.
- [ ] Refused, incomplete and malformed output fails safely without accepting partial food intelligence; source validation is retained.
- [ ] New model/profile changes cannot reuse old weekly cache or old acceptance evidence; existing enrichment results remain usable without paid reprocessing.
- [ ] Meaningful offline request/response tests and required local/CI checks pass with actual counts recorded separately from hosted/model-backed tests.
- [ ] Runbook coordinates model variables, settings, pricing, approval, evaluation, cache/session checks and rollback for the full chain.

## Validation and release

Offline mocked HTTP tests inspect the actual adapter request and exercise success/failure; existing domain/evaluation suites validate food constraints. These do not establish new model quality, latency or project access. After explicit budget/environment approval, use a small synthetic enrichment corpus followed by the existing 30-plan hosted evaluation, retaining the accepted threshold and no unsupported-output requirement. Verify persisted new enrichments feed weekly candidates, cache hit on reopen, model/profile invalidation and unavailable/recovery states on mobile.

Draft PR only. Migrations: none. Edge changes: enrich-recipe, generate-weekly-preparation-plan and evaluate-weekly-preparation via shared code. Deploy only through the approved exact-main protected Edge workflow after separate approval. No production configuration changes or paid evaluations during implementation. Fixed incremental cost A$0/month and A$0/year; variable forecast, rates and approval are in the handover. No successful public smoke can replace model acceptance.
