# Development standards

These standards describe the current Cooksmith v2 implementation baseline. Follow the [project structure](v2/project-structure.md), [design system and routing](v2/design-system-and-routing.md), [dependency policy](v2/dependency-management.md) and accepted ADRs for additional detail.

## TypeScript

- Use strict TypeScript and typed boundaries. Prefer `unknown` plus validation over unsafe assertions.
- Do not use `any` without a narrow, documented justification and a containment test.
- Model stable domain states with explicit unions or enums. Keep database-generated types separate from domain models.
- Use type-only imports when a runtime value is unnecessary.
- Handle nullable and optional values deliberately. Do not silence compiler errors to bypass validation.

## React, components and routing

- Use React 19 and the repository's React Router 7 data-router structure.
- Keep route composition in `src/app` and `src/routes`; keep generic presentation primitives in `src/components`.
- Generic UI components contain no household or product business logic.
- Prefer semantic HTML and controlled component APIs with typed props.
- Add a component or abstraction only for a current approved use case. No speculative components, broad barrel files or premature frameworks.
- Every visible action must work. Do not add fake buttons, dead links or controls that imply unavailable functionality.
- Route changes must preserve direct navigation, refresh, back/forward behaviour, meaningful titles, loading/error handling and active navigation state.

## Dependency direction

Dependencies flow inward:

```text
presentation -> application -> domain
                         ^
                         |
                 infrastructure adapters
```

- `domain` is framework-independent and imports no React, router, Supabase client or browser API.
- `application` orchestrates use cases and depends on domain contracts and infrastructure ports.
- `infrastructure` implements approved external and persistence adapters.
- `routes`, `components` and `app` compose presentation and call application services.
- `shared` contains only small utilities that are genuinely cross-cutting.

Do not bypass application or domain validation by calling persistence directly from generic UI components.

## Naming and imports

- Use `PascalCase` for React components and exported types, `camelCase` for values/functions and descriptive kebab-case for documentation.
- Use explicit, domain-relevant names. Avoid ambiguous `utils`, `helpers`, `manager` or `data` modules when a precise name exists.
- Prefer direct imports over broad index modules. Keep imports inside the approved dependency direction.
- Do not import prototype code into v2.

## Errors, configuration and logging

- Represent expected validation and use-case failures as typed results or approved error types.
- Route and application boundaries handle unexpected failures and show safe user-facing copy with a correlation identifier.
- Never expose raw provider payloads, stack traces, database details or secrets to users.
- Read environment values only through `src/config` and validate them at startup. Browser variables must be explicitly approved as public.
- Log structured operational metadata only. Do not log tokens, email addresses, allergy details, household notes, recipe content or other sensitive data.
- Never catch and silently discard errors. Recover, translate or propagate them deliberately.

## Accessibility and responsive design

- Target WCAG 2.2 AA. Use semantic landmarks, labels, heading order, keyboard operation and visible focus.
- Do not rely on colour, hover, gesture, placeholder text or motion alone.
- Maintain at least 44-pixel touch targets and respect `prefers-reduced-motion`.
- Manage focus for routes, dialogs, sheets, validation and destructive confirmations.
- Design and test small mobile widths first, then larger mobile, tablet and desktop. Prevent horizontal overflow and account for safe areas.
- Automated accessibility checks supplement, not replace, assistive-technology and device testing.

## Dependencies and dead code

- Prefer the current approved stack and browser/platform APIs.
- Do not add unapproved dependencies, providers or services.
- A dependency must solve a present need, be exact-versioned, have acceptable security/maintenance characteristics and include its lockfile change.
- Follow the [cost checklist](checklists/cost-approval.md) before any paid or recurring-cost change.
- Remove superseded code, imports, flags and documentation within the approved change when safe. Do not retain dead compatibility layers without an explicit requirement.

## Documentation and review

For Codex-led work, the enforceable baseline, scope, pull-request truthfulness, hosted-preview and completion-report rules live in [Codex build rules](CODEX_BUILD_RULES.md). Keep this document focused on implementation standards and cross-reference rather than duplicating operational workflow rules.

- Document public contracts, non-obvious constraints, security boundaries, migrations and operational steps.
- Comments explain why, not what syntax already states.
- Update standards, route maps, policy matrices, generated types, ADRs, handovers and reports when the implementation changes them.
- Keep documentation accurate and linked rather than duplicating large sources.
- Before review, run the applicable [testing standards](TESTING_STANDARDS.md) and [release checklist](RELEASE_CHECKLIST.md).
