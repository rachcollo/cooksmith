# Jira blocker direction correction

- **Date:** 2026-11-17
- **Branch:** `chore/jira-blocker-direction`
- **Target:** `main`
- **Baseline:** `daa46a858513d4e6537685e301e728fb5da01a64`
- **Status:** Implemented, validation pending
- **Commit and PR:** Exact published head and CI evidence are recorded in the PR.

## Objective and product impact

Correct delivery admission's reversed Jira link interpretation. This protects
reliable sequencing and removes incorrect manual dependency checks without changing
application or database behaviour. It does not activate delivery automation.

## Evidence and behaviour

The coordinating thread's read-only Jira investigation supplied these relationships:

- CS-111 has a Blocks link with outwardIssue CS-122; CS-122 has inwardIssue CS-111.
- CS-116 has inwardIssue CS-79 and CS-101; those prerequisites have outwardIssue CS-116.
- The type labels are inward `is blocked by` and outward `blocks`; packages agree.

A shared parser now requires those labels and exactly one valid endpoint. It treats
inwardIssue as upstream and outwardIssue as downstream. Missing, reversed or custom
direction evidence fails closed. Non-Done or unknown upstream status blocks pickup;
an unfinished downstream dependant does not block unrelated work. Links to active
stories prevent concurrency in either direction, even if a stale status says Done.

No Jira links or statuses were changed. PRs #227 and #228 remain untouched. The
existing locks, claims, limits, approval gates and runtime activation blockers remain.

## Files and validation

Changed: the new `scripts/engineering/lib/jira-dependencies.mjs` parser, its selector
and parallel-safety consumers, their two regression suites, the admission runbook,
and this handover. No migrations, Edge Functions, providers or dependencies changed.

Focused tests passed: 52 tests across the selector and build-admission suites,
including fixtures matching the supplied relationships and ambiguous-link negatives.
Full local validation passed: npm ci, preflight, format and format:check, lint,
typecheck, 930 tests across 109 files, build, documentation-command audit and secret
scan. Local Chromium and Docker are unavailable (confirmed by preflight:e2e and
db:prerequisites:runtime); CI retains browser and database coverage. Exact-head CI
results are recorded in the PR. No live admission or claim operation is used for
testing.

## Verification, limitations and rollback

Review the link fixtures and run the focused suites. Keep the Routine inactive until
its separate activation requirements are met. Hosted application flows, physical
devices and assistive technology were not tested because this is delivery tooling
only. Local browser/database availability and CI coverage are stated in the PR.

To disable the changed behaviour, pause pickup; do not mutate Jira dependencies or
weaken gates. A code revert alone would restore the known reversed-direction bug.
No new milestone begins here; independent review and human merge remain next steps.

## Security, privacy, accessibility and cost

No credentials, protections, household data, production resources or accessibility
behaviour changed. Secret scanning is required before publication. Additional
provider/dependency cost: A$0 monthly and A$0 annually.
