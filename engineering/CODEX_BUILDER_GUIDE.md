# Cooksmith Codex Builder Guide

## Mission
Take one eligible Cooksmith Jira issue from Ready through implementation and PR review using its repository engineering package as the contract. Do not start unapproved backlog work.

## Inputs
- Jira project: `CS`
- Engineering index: `engineering/COOKSMITH_ENGINEERING_INDEX.md`
- Package template: `engineering/ENGINEERING_PACKAGE_TEMPLATE.md`
- Eligible packages: `engineering/ready/*.md`

## Recommended Human Prompt
> Get the next eligible Cooksmith Jira task, implement its engineering package, and move it through the delivery flow. Stop before merge for approval.

For a named task:
> Build CS-18 using its engineering package and stop when the PR and hosted preview are ready for review.

## Phase 1 — Select and Claim
1. Query Jira for `project = CS AND status = Ready`.
2. Read the engineering index.
3. Exclude issues with incomplete blockers.
4. Exclude issues without a matching package under `engineering/ready/`.
5. Check for an existing branch or open PR referencing the Jira key.
6. Select the highest-priority eligible item.
7. Read the full Jira issue and package.
8. Transition Jira to `In Progress`.
9. Comment with package path, branch, start SHA, and concise plan.
10. Branch from current `main`.
11. Move the package from `engineering/ready/` to `engineering/building/` in the branch.

Claim one issue only unless parallel work is explicitly authorised.

## Phase 2 — Validate Baseline
Before editing:
- pull current `main`;
- inspect recent relevant PRs;
- inspect schema, migrations, RLS, components, server actions, and tests;
- run targeted existing tests where feasible;
- verify package assumptions.

If the package materially conflicts with the repository, stop and report the conflict in Jira instead of inventing a broad redesign.

## Phase 3 — Implement
- Keep changes focused on the package.
- Follow existing architecture and conventions.
- Use additive, safe migrations.
- Preserve authentication and household isolation.
- Add negative authorization tests.
- Prefer direct, uncluttered UI.
- Do not silently expand scope.
- Never commit secrets or local environment files.
- Update the package only when clarification is necessary and explain changes in the PR.

Commit messages should include the Jira key, for example:
`CS-18 add persisted planner reordering`

## Phase 4 — Validate
Run repository-defined checks, including as applicable:
- formatting;
- lint;
- type checking;
- unit tests;
- integration tests;
- pgTAP/database tests;
- end-to-end tests;
- production build.

For failures:
1. Determine whether the branch caused them.
2. Fix branch-caused failures.
3. Document genuine pre-existing or environment limitations.
4. Never claim a required check passed when it was not run.

Validate migrations only against a disposable or approved non-production environment.

## Phase 5 — Open PR
1. Move the package to `engineering/review/`.
2. Push the branch.
3. Open a PR titled `[CS-###] [Milestone] — [Title]`.
4. Include Jira link, package path, outcome, implementation summary, schema/migration notes, security/RLS notes, tests, screenshots, preview link, manual checklist, limitations, and rollback notes.
5. Transition Jira to `In Review`.
6. Add the PR link to Jira.

Do not merge automatically.

## Phase 6 — CI and Hosted Preview
Monitor checks and inspect actual logs on failure. When checks pass:

1. Validate every package acceptance criterion in the hosted preview.
2. Test desktop and mobile critical paths.
3. Test keyboard behaviour for interactive UI.
4. Test a negative household-isolation scenario where practical.
5. Record evidence in the PR.
6. Transition Jira to `Testing`.

If preview is unavailable because of missing credentials/configuration, identify the prerequisite and do not claim acceptance.

## Phase 7 — Human Approval Gate
Stop and request approval when:
- required checks pass;
- hosted preview is validated;
- risks are documented;
- Jira is in Testing;
- PR is ready to merge.

## Phase 8 — After Explicit Merge Approval
1. Confirm approved commit still matches PR head.
2. Merge with the repository’s normal strategy.
3. Confirm deployment and required migration workflow.
4. Verify the target environment.
5. Move the package to `engineering/completed/` on `main`.
6. Transition Jira to Done.
7. Add PR, merge commit, release result, migration result, and follow-ups.
8. Update the engineering index.

A merged PR is not Done while a required production migration or release action remains outstanding.

## Stop Conditions
Stop and request guidance when:
- Jira and package describe different outcomes;
- dependencies are not merged;
- production credentials are required;
- destructive migration risk is discovered;
- household isolation cannot be proven;
- a broad architecture rewrite appears necessary;
- another branch/PR already owns the issue;
- acceptance criteria cannot be met within scope.

Never bypass checks, force-push shared branches without approval, deploy production data changes without confirmation, or fabricate evidence.

## Workflow Mapping

| Delivery event | Jira status |
|---|---|
| Package approved and dependencies complete | Ready |
| Codex claims issue | In Progress |
| PR opened | In Review |
| CI passes and preview validation begins | Testing |
| PR merged and required release work complete | Done |
| Readiness lost or dependency reopens | Backlog |

## Completion Summary
Report Jira issue/status, branch, PR, package path, commits, checks/results, preview result, migration/deployment result, remaining human action, and follow-up Jira issues.
