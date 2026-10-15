# CS-103 — Authorised Luna profile transition

- **Jira issue:** [CS-103](https://smillins.atlassian.net/browse/CS-103)
- **Status:** Ready
- **Branch:** `fix/cs-103-profile-transition`
- **Baseline:** `main` at `3f2156cd28a5d8e38593894b4febe1949a559e6c`

## Outcome and scope

Finish the approved model migration without impersonating an administrator or weakening release gates. A confirmed admin action prepares the fixed Luna low profile while both AI features are disabled. It does not set secrets, run a provider, enable AI, reprocess recipes or accept evaluations. This protects household trust and removes manual privileged SQL from the transition.

## Acceptance criteria

- [ ] Only a real application administrator can invoke the profile transition; anonymous/member calls and direct profile writes stay denied.
- [ ] Both AI flags must be false, corpus v13 retained and active evaluation/enrichment work absent.
- [ ] Exact approved model/prompt/pricing identity is applied atomically with before/after audit; stale smoke evidence is cleared, historical evaluation and acceptance records retained.
- [ ] Duplicate preparation preserves new smoke evidence; activation still requires current accepted evidence.
- [ ] Admin UI confirms, refreshes current evidence, exposes failures honestly, and performs no automatic paid evaluation or activation.
- [ ] Local static, real PostgreSQL and browser checks plus CI have evidence; hosted transition remains a protected post-release task.

## Release

One new additive migration; no Edge changes or dependencies. This PR does not deploy Production. After owner merge, release the exact approved main SHA through protected Production database release, including dry-run and migration-history verification. Released migrations are immutable; use forward fixes. Frontend deployment must include this action before hosted testing. Fixed incremental cost A$0/month and A$0/year. No provider calls during implementation; the existing A$2 migration test cap remains for separately coordinated hosted work.
