# EP004 engineering standards update handover

## Status

Implemented locally. Remote publishing and pull-request verification are pending because this checkout has no configured Git remote.

## Scope completed

EP004 updates process and documentation only. It strengthens the permanent Codex build rules and related engineering standards for baseline verification, local validation, hosted preview evidence, authentication preview testing, pull-request truthfulness, Production migration release discipline, completion-report accuracy, stable tests, environment warnings and scope discipline.

## Product and milestone boundary

No product functionality, database schema, provider configuration, application dependency or GitHub Actions behaviour changed. Milestone 7A has not begun.

## Validation

Required local validation passed for this documentation-only package:

- `npm ci`
- `npm run format`
- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `python3 - <<'PY' ...` local Markdown link checker
- `git diff --check`
- `python3 - <<'PY' ...` credential-pattern scan

Hosted provider, database and Vercel preview validation were not required because no product, auth, database, provider or user-facing runtime behaviour changed.

## Branch and publishing

- Baseline commit: `43eb188ba9f314456314ebf5fb192f0fecbd5b3d`
- Branch: `ep004-engineering-standards-update`
- Local commit: this local commit; final SHA is reported in the pull-request handover and final response
- Pull request: pending real GitHub PR creation and verification

## Next recommended work

After EP004 is reviewed and accepted, the next recommended work is Milestone 7A Pantry Foundation.

Future Codex tasks must follow the updated baseline, local-validation, pull-request truthfulness and hosted-preview rules before implementation, publishing and handover.
