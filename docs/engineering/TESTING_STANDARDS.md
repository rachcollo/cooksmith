# Testing standards

Tests provide evidence for approved behaviour, security boundaries and regressions. They must be deterministic, meaningful and proportional to risk.

## Test layers

| Layer         | Purpose                                                       | Current location or tool         |
| ------------- | ------------------------------------------------------------- | -------------------------------- |
| Unit          | Isolated domain rules, utilities and validation               | `tests/unit`, Vitest             |
| Component     | Accessible component behaviour and states                     | `tests/unit`, Testing Library    |
| Integration   | Application behaviour across real module boundaries           | `tests/integration`, Vitest      |
| Database      | Migrations, constraints, functions, seeds and generated types | `supabase/tests`, pgTAP          |
| RLS           | Real PostgreSQL policies, privileges and tenant isolation     | `supabase/tests`, pgTAP          |
| End-to-end    | Critical browser journeys, history and overlays               | `tests/e2e`, Playwright          |
| Accessibility | Semantics, names, focus, keyboard and automated violations    | Testing Library, axe, Playwright |
| Responsive    | Mobile, tablet and desktop behaviour and overflow             | Playwright viewports             |
| Regression    | A focused reproduction for each practical defect fix          | Nearest appropriate layer        |

## Behaviour and test quality

- Verify observable behaviour, state changes, contracts and failure handling. Do not test implementation trivia.
- Use clear names describing actor, condition and expected outcome.
- Keep tests independent and deterministic. Freeze time or inject randomness when the behaviour depends on it.
- Prefer the lowest layer that proves the requirement without weakening realism.
- Critical behaviour cannot rely on snapshot-only coverage. Snapshots may supplement explicit behavioural assertions.
- Do not mark a test skipped merely to make CI pass. Record a justified limitation or fix the environment.
- Test loading, empty, error, disabled, busy and recovery states when the changed behaviour exposes them.

## Fixtures and privacy

- Use synthetic, deterministic identities and household data.
- Never use real customer data, credentials, private URLs or copied production payloads.
- Keep fixtures minimal and make cross-household identifiers visibly distinct.
- Automated tests must not call live paid providers. Use validated fakes or contract fixtures unless an explicitly approved provider test environment exists.

## Security and adversarial coverage

- Run real PostgreSQL RLS policies when policy behaviour is under test. Do not mock RLS, membership helpers or database grants.
- Cover owner, member, unrelated user, inactive member and unauthenticated contexts as applicable.
- Attempt identifier substitution, cross-household reads and writes, self-escalation, forbidden role grants and update-scope changes.
- Cover missing, malformed, stale or insufficient JWT/session claims when the milestone owns authentication or token handling.
- Verify denied operations as well as allowed operations. Confirm application roles do not imply household access.
- Test validation at trust boundaries and ensure errors do not leak secrets, provider payloads or private data.

## Accessibility and responsive coverage

- Component tests verify accessible names, labels, error associations, keyboard behaviour and focus management.
- Browser tests cover representative mobile, tablet and desktop widths, navigation, direct URLs, refresh, history and no horizontal overflow.
- Run automated axe checks on representative routes and overlays. Fix serious and critical findings.
- Automation does not prove complete WCAG conformance. Record whether keyboard, assistive technology and physical devices were actually used.

## Organisation and CI

Follow the baseline, local-validation, hosted-preview, authentication and flaky-test rules in [Codex build rules](CODEX_BUILD_RULES.md). Completion evidence must separate local automation, hosted validation, manual validation, unavailable checks and assumptions.

- Name TypeScript tests `*.test.ts` or `*.test.tsx`, Playwright files `*.spec.ts` and pgTAP files `NNNN_description.test.sql`.
- Place regression coverage beside the closest existing suite and keep setup reusable without hiding important context.
- Pull requests targeting `main` must pass formatting, lint, strict types, Vitest, build, database reset/lint/pgTAP/types, Playwright and axe checks when applicable.
- Do not weaken, bypass or remove a gate to land a feature.

## Unavailable local runtimes

If Docker, Chromium, VoiceOver or a physical device is unavailable:

1. complete implementation and every available check;
2. preserve the real CI or manual validation path;
3. report the exact command attempted and why it could not run;
4. use the task's honest pending status;
5. do not call the task blocked solely for that reason;
6. do not claim the unavailable validation passed.
