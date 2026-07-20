# Observability: error monitoring and product analytics

Cooksmith uses Sentry for browser error monitoring and PostHog for a small, fixed set of product events. Both are optional at runtime: with no keys configured the application uses a no-op backend and sends nothing anywhere. This keeps local development, tests and CI silent by default.

## Cost note

Both services run on their free tiers (Sentry Developer plan, PostHog Free plan), which comfortably cover a private friend test. Neither requires a card. Any upgrade to a paid tier needs the usual cost approval before it happens.

## Configuration

Three optional public values, set per environment (Vercel project settings for hosted builds, `.env.local` for local work). They are publishable client values, not secrets, so the `VITE_` prefix is correct.

| Variable            | Value                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `VITE_SENTRY_DSN`   | Sentry: Project → Settings → SDK Setup → Client Keys (DSN)                                |
| `VITE_POSTHOG_KEY`  | PostHog: Project → Settings → Project API key (starts `phc_`)                             |
| `VITE_POSTHOG_HOST` | Optional. PostHog ingestion host shown next to the API key; defaults to the US cloud host |

Leaving all three blank disables observability entirely. Setting `VITE_POSTHOG_HOST` without `VITE_POSTHOG_KEY` fails the environment parse so a half-configured build cannot ship silently.

## Privacy stance

- No autocapture, no session recording, no default PII collection. Events are named actions with counts only.
- Pageviews send the path only, never the query string or hash, because auth callback URLs carry tokens.
- No identify calls: users are anonymous device identifiers, and no household content, names or emails are ever sent.
- Sentry receives the error object and a correlation id tag that matches the on-screen reference shown by the error boundary, so a friend's screenshot can be matched to the exact report.

## Event catalogue

| Event                     | Fired when                                             |
| ------------------------- | ------------------------------------------------------ |
| `account_created`         | Sign-up form submits successfully                      |
| `onboarding_completed`    | Dietary step finishes onboarding                       |
| `recipe_created`          | A recipe is saved manually                             |
| `recipe_imported`         | A URL-imported recipe is saved                         |
| `meal_planned`            | A dinner is added to the planner                       |
| `shopping_list_generated` | "Add this week's meals" confirms (`itemCount`)         |
| `shopping_item_completed` | A shopping item is marked done                         |
| `$pageview`               | Route change (path only), giving visits and return use |

Together these instrument the friend-test success measures: activation (onboarding completed plus meals planned), core value (list generated and items completed) and retention (return pageviews). Add new events sparingly and record them here.

## Implementation

`src/infrastructure/observability/observability.ts` owns the backend. `initObservability` runs once at bootstrap in `main.tsx`, dynamically importing the SDKs only when keys exist so they stay out of the main bundle. The error boundary reports render failures with the correlation id, the route announcer reports pageviews, and pages call `track` after successful mutations. Tests swap the backend with `setObservabilityBackend`.
