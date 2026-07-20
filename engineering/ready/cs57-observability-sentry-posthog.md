# CS-57 — Sentry error monitoring and PostHog product analytics

## Metadata

- **Milestone:** `Observability`
- **Title:** Add Sentry error monitoring and PostHog product analytics
- **Jira issue:** `CS-57`
- **Epic:** `Infrastructure & Release (CS-7)`
- **Status:** `Ready`
- **Branch:** `feat/cs-57-observability`
- **Depends on:** `None`
- **Blocks:** `None`
- **Package path:** `engineering/ready/cs57-observability-sentry-posthog.md`

## Product Outcome

The Cooksmith team gains privacy-first error monitoring and lightweight product
analytics in preview and production, so real failures are visible and basic
usage is understood, without collecting or exposing any household personal
data.

## Current Baseline

The app boots in `src/main.tsx`, loading public configuration through
`src/config/env.ts` before rendering. `src/infrastructure/logging/logger.ts`
already redacts sensitive keys for local structured logging. There is no
error-monitoring or analytics provider. Preview and production build
environments are validated in `env.ts` and identified by `VITE_APP_ENV`.

## Scope

### Included

- A single observability module (`src/infrastructure/observability/`) that
  initialises Sentry (error monitoring) and PostHog (EU analytics) from
  environment configuration.
- Activation only in preview and production, and only when the relevant
  environment variable is present.
- Strict privacy defaults and scrubbing (see PII section).

### Explicitly Out of Scope

- Sentry Session Replay and PostHog session recording.
- PostHog autocapture and data-warehouse source connections.
- Identifying users by opaque id (deferred pending a privacy decision).
- Performance tracing, Sentry logs and application metrics.
- Custom product event instrumentation beyond automatic pageviews.

## Functional Requirements

### FR-1 — Environment-gated initialisation

**Acceptance criteria**

- [ ] Sentry initialises in preview and production when `VITE_SENTRY_DSN` is set.
- [ ] PostHog initialises in preview and production when `VITE_POSTHOG_KEY` is set.
- [ ] Neither initialises in development or test, nor when its variable is absent.
- [ ] Sentry events are tagged with the environment and the build commit release.

### FR-2 — Privacy-first data handling

**Acceptance criteria**

- [ ] No Sentry Session Replay and no PostHog session recording are enabled.
- [ ] PostHog autocapture is disabled so on-screen household content is not captured.
- [ ] IP addresses are not stored (`sendDefaultPii: false`; PostHog `$ip` denylisted).
- [ ] URL query strings and fragments are stripped from captured events.
- [ ] Email, token, cookie, password, secret and auth-header fields are scrubbed before send.
- [ ] No user is identified to either tool by email or any personal identifier.

### FR-3 — Single ownership and safety

**Acceptance criteria**

- [ ] Only the observability module imports the provider SDKs.
- [ ] Initialisation failures are caught and never break application boot.
- [ ] Configuration is read from environment only and never committed.

## PII and privacy self-check

This is the privacy contract for the change, checked against the
implementation.

| Requirement | Enforcement | Test |
| --- | --- | --- |
| No replay or recording | Sentry adds no replay integration; PostHog `disable_session_recording: true` | init tests assert `integrations` absent and recording disabled |
| No autocapture of household content | PostHog `autocapture: false` (pageviews only) | init test asserts `autocapture` false |
| No stored IP | Sentry `sendDefaultPii: false`; PostHog `property_denylist: ['$ip']` | init tests assert both |
| Query strings stripped | `scrubUrl` applied to Sentry `request.url` and PostHog url properties | `scrubUrl`, event and property tests |
| Sensitive fields scrubbed | `scrubRecord` drops sensitive keys and email-shaped values; cookies and headers cleaned | `scrubSentryEvent`, `sanitisePosthogProperties` tests |
| No PII identity | Sentry `event.user` deleted and `setUser` never called; PostHog `person_profiles: 'identified_only'`, `identify` never called | event test asserts user removed; grep confirms no identify/setUser on SDKs |
| Off without config or in dev/test | `shouldActivate` plus per-provider presence guard | two "does nothing" tests |
| Config never committed | Read via `VITE_*`; `.env.example` blank placeholders; publishable browser-safe values | secret scan passes |

## Security and Privacy

- The Sentry DSN and PostHog project key are publishable, browser-safe values,
  not secrets, and are provided through Vercel environment variables.
- No server secret, service-role value or household data is exposed.
- RLS and authorisation are unaffected; this change adds no data access.

## Accessibility

- No user-facing UI is added, so there is no accessibility surface change.

## Test Plan

### Unit tests

- Activation gating by environment and mode.
- URL, Sentry-event and PostHog-property scrubbing.
- Injected-fake init proving privacy options and skip behaviour.
- Environment parsing of the new optional configuration.

### Integration and end-to-end tests

- Not required: no user-facing behaviour changes. Provider delivery is verified
  by hosted preview smoke testing, not by calling live providers in automated
  tests (Testing Standards prohibit live paid-provider calls).

## Quality Gates

- [ ] Lint passes.
- [ ] Type checking passes.
- [ ] Unit tests pass.
- [ ] Production build passes.
- [ ] No secrets committed.
- [ ] Hosted preview manually validated with env vars set.

## Definition of Done

- [ ] Acceptance criteria met.
- [ ] Automated coverage protects gating and scrubbing.
- [ ] No PII or household data leaves the browser.
- [ ] Preview validated with a deliberate error and pageviews.
- [ ] PR passed checks and review.
- [ ] Jira moved through workflow.

## Deferred work

- Opt-in association of errors and events with an opaque user or household id,
  pending a privacy decision.
- Explicit, reviewed product-event instrumentation.
- Optional performance tracing if a need arises.

## PR Requirements

PR title: `CS-57: Add Sentry error monitoring and PostHog analytics`

Include Jira issue, package path, delivered behaviour, the PII self-check
result, configuration and cost notes (A$0), and hosted preview instructions.
