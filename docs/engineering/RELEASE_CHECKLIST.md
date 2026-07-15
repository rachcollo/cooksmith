# Release and merge checklist

Use the applicable section before requesting review or release. Record actual evidence in the completion report and pull request.

## Normal milestone pull request

- [ ] Branch was created from the latest accepted `main` commit.
- [ ] Pull request targets `main`; `main` changes only through the reviewed merge.
- [ ] Diff contains only the approved milestone scope and no later-milestone work.
- [ ] Product code, tests and documentation follow the engineering standards and accepted ADRs.
- [ ] `npm ci`, format, lint, type-check, tests and production build pass.
- [ ] Changed journeys have appropriate component, integration, end-to-end, accessibility and responsive evidence.
- [ ] Preview opens safely and changed behaviour is verified where applicable.
- [ ] No fake actions, dead code, debug output, real customer data or secrets remain.
- [ ] Dependency and cost impact are recorded, including `A$0` where applicable.
- [ ] Documentation, ADRs, completion report and milestone handover match the implementation.
- [ ] Rollback, disablement or forward-fix approach is documented.
- [ ] Local and remote commit trees match and required CI checks pass.

## Database and security pull request

Complete the normal checklist plus:

- [ ] Migration is timestamped, additive where practical and schema-qualified.
- [ ] No shared migration was edited or renamed.
- [ ] Constraints, foreign keys, indexes, triggers and functions are explicitly reviewed.
- [ ] Functions use a secure explicit `search_path`; security-definer use is justified and restricted.
- [ ] RLS is enabled on every new or exposed private table.
- [ ] Grants and operation policies implement default deny with `using` and `with check` where required.
- [ ] Owner, member, unrelated, inactive and identifier-manipulation cases are covered as applicable.
- [ ] Real PostgreSQL policies, not mocks, execute in the RLS tests.
- [ ] Fresh reset, database lint, pgTAP and generated-type freshness pass.
- [ ] Policy matrix, generated types, migration impact and forward-fix plan are current.
- [ ] No hosted or Production database, credential or real data was used for normal validation.

## Production release

- [ ] Production release scope and target commit have explicit approval.
- [ ] The exact release commit passed review and CI before merging to `main`.
- [ ] All required CI checks pass on the exact release commit.
- [ ] Production environment variables, redirect URLs and public/secret boundaries are reviewed without exposing values.
- [ ] Preview or staging verification passed against the release candidate.
- [ ] Accessibility and critical mobile journeys received the required manual verification.
- [ ] Database migration order, compatibility window, backup confirmation and forward-fix plan are approved.
- [ ] RLS, grants, service-role use, secrets scan and security review pass.
- [ ] Provider tiers, monthly/annual costs and budget approval are confirmed.
- [ ] Monitoring, correlation, support and incident ownership are ready where applicable.
- [ ] Release notes, completion report and operational documentation are current.
- [ ] A named decision-maker confirms go/no-go and the release window.
- [ ] Post-release smoke checks and rollback/forward-fix triggers are defined.

Never modify or merge to `main`, migrate Production, rotate secrets or activate paid services merely because this checklist exists. Each action still requires its own explicit authority.
