# Cooksmith Delivery Orchestrator

## Goal

Provide deterministic rules so an AI engineer can continuously deliver Cooksmith without
requiring bespoke prompts.

## State Machine

Backlog
→ Ready
→ In Progress
→ In Review
→ Testing
→ Done

Only one transition may occur at a time.

---

# Run Loop

1. Read Engineering Index.
2. Query Jira for `status = Ready`.
3. Remove issues that:
   - have blockers,
   - already have an open PR,
   - have no engineering package.
4. Select highest priority issue.
5. Claim issue.
6. Create branch.
7. Move package:
   ready → building
8. Implement package.
9. Run validation.
10. Open PR.
11. Move package:
    building → review
12. Wait for CI.
13. Validate hosted preview.
14. Move Jira:
    In Review → Testing
15. Await human approval.
16. Merge.
17. Run deployment / migrations if required.
18. Move package:
    review → completed
19. Move Jira:
    Testing → Done
20. Select next Ready issue.

---

# Failure Recovery

If CI fails:
- inspect logs
- repair only branch-caused failures
- rerun checks

If preview fails:
- fix defects
- repeat validation

If deployment fails:
- stop automation
- do not mark Done
- create follow-up issue if required

---

# Human Gates

Required only for:

- approving engineering package
- approving merge
- production database confirmation

Everything else is autonomous.

---

# Parallelism Rules

Safe in parallel only when:

- different epics
- no schema conflicts
- no dependency relationship

Maximum:
- one active issue per engineer.

---

# Completion Record

Every completed issue must record:

- Jira key
- branch
- PR
- merge commit
- preview URL
- deployment status
- migration status
- package path
