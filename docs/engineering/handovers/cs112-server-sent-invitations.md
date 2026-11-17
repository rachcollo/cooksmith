# CS-112 handover: Server-sent household invitations

- **Date:** 2026-11-17
- **Branch:** `feat/cs-112-server-sent-invitations`
- **Target:** `main`
- **Baseline:** `b68832ee2134d53f36c7c910980085eab9fb3086`, fetched remote main containing documentation PR #230.
- **Status:** Implemented, validation pending. Keep the PR draft until required CI, isolated hosted authentication validation and human release reviews are complete.

## Objective and product impact

Replace inviter-side OTP with a clear invitation email delivered by the server through the existing Resend account. Protect household trust and remove the need for owners to troubleshoot ambiguous sign-in emails. Sending, resending and opening do not create an account. Recipients explicitly choose acceptance/authentication; membership requires a matching verified email.

## Changes and ownership

- `supabase/functions/send-household-invitation/{index,handler}.ts`: bounded, authenticated orchestration, escaped HTML/plain-text template, Resend idempotency key and safe failures.
- New migration `20261117105847_cs112_server_sent_invitations.sql`: send-attempt log, database rate limits, token-free client RPC results, service-only claim/outcome functions, restricted hash reads and explicit verified-email acceptance.
- `src/infrastructure/households/supabaseHouseholdPeopleRepository.ts`: invoke the function, never someone else's Auth OTP.
- `src/routes/InvitationAcceptancePage.tsx`, `src/app/router/createAppRouter.tsx`: passive public landing, explicit acceptance, tab-scoped continuation, URL cleanup and wrong-account recovery.
- `src/routes/SettingsPage.tsx`: disable duplicate actions, refresh pending invitations after failure and retain the entered address for retry.
- `vercel.json`: invitation-route no-referrer/no-store headers.
- Protected Edge release workflow: declare/deploy/verify the new function under the existing exact-SHA approval gate; not dispatched.
- Scoped generated types, pgTAP/API contracts, function/component/browser tests and `tsconfig.test.json` include.
- [Invitation runbook](../v2/household-invitations.md) and [proposed ADR 021](../../architecture/decisions/021-server-sent-household-invitations.md).

No dependency, scheduled job or hosted configuration change. CS-117 retains AuthPages/authErrors welcome/password copy, onboarding and optional preferences. This branch does not change those files. CS-113/CS-116 scopes and migrations are untouched. CS-117's proposed neutral profile name requires a product decision: invitation email can render it, but “Household member” does not meaningfully identify the inviter. Existing names must be preserved.

## Local validation evidence

| Check                                                                                          | Actual result                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                                                                                       | Passed using `/tmp` npm cache; default managed-home cache was unwritable                                                              |
| `npm run preflight`                                                                            | Passed: Node 24.19.0, npm 11.9.0, Supabase CLI 2.109.1                                                                                |
| Format/write, format check, lint, strict types, production build                               | Passed; generated-type compilation rerun after local generation                                                                       |
| `npm run test`                                                                                 | 111 files, 947 tests passed                                                                                                           |
| Function tests                                                                                 | 11 handler cases and 2 real-adapter boundary cases, with separate mail/Auth boundaries and synthetic credentials                      |
| `npm run db:reset` / `db:lint`                                                                 | Fresh migration/seed reset passed; no schema lint errors                                                                              |
| `npm run db:test`                                                                              | 44 files, 808 pgTAP assertions passed, including `0050_server_sent_invitations.test.sql`                                              |
| `npm run db:test:security`                                                                     | 5 files, 112 assertions passed                                                                                                        |
| `npm run db:types` / `db:types:check`                                                          | Generated from local database; freshness passed; diff contains invitation objects only; explicit table-name type contract updated     |
| Local security advisors                                                                        | No issues found (`supabase-go db advisors --local --type security --level warn`)                                                      |
| Chromium suite                                                                                 | 56 passed; 2 existing checked-in skips; new invitation checks passed on desktop and mobile, including axe/keyboard/320–1280 px widths |
| Final invitation browser rerun                                                                 | 4 passed after recovery refinements                                                                                                   |
| WebKit                                                                                         | 12 tests could not launch due missing GTK/Graphene/Harfbuzz/Manette/Hyphen/WOFF/GLES system libraries; root/su install unavailable    |
| Docs commands, database config, scoped Markdown links, whitespace, production dependency audit | Passed; dependency audit retains the existing reviewed React Router RSC exception                                                     |
| Authenticated HTTP contracts                                                                   | See final PR evidence; clean service restart and synthetic tests are run before publication                                           |
| Secret scan                                                                                    | Run on staged content before each commit; no credentials or sensitive environment files are included                                  |

The default local Supabase image `17.6.1.143` hit registry throttling and disk exhaustion because this runner uses Docker's `vfs` driver. A second layered image also grew excessively. The safe local workaround flattened the public `17.4.1.064` image's filesystem and startup configuration into one local image layer, used an untracked `.temp/postgres-version` override and excluded Studio. Fresh reset, migrations, pgTAP, lint, advisors and generated types then executed on real isolated Postgres 17. No tracked runtime configuration or hosted resource was altered; normal CI retains the default runtime. The CLI's “branch main” reset message refers to its local database branch, not the Git feature branch.

The first full Playwright attempt was interrupted by database-image disk exhaustion. Chromium passed after recovery. WebKit remains independently pending in CI. Build emits the existing large-chunk advisory. The CLI needed permission to initialise its local configuration directory; this did not grant hosted access.

GitHub exact-head CI and publication identity are recorded in the draft PR and final delivery report, separately from these local results. No independent reviewer has approved this change; a self-review checked privilege grants, token handling, failure boundaries and scope.

## Hosted and manual validation

Not performed. Current Preview shares Production Supabase configuration; hosted authentication, invitation sends and database writes are unapproved. No isolated hosted environment has been proven. No live emails, account creation, deployment, migration or Auth configuration changes were performed.

In an explicitly approved isolated environment, use synthetic owner/recipient accounts and stub/test email delivery to verify: owner invite/resend/cancel, correct inviter/household names, no Auth record on send/open, explicit verified signup, existing-user sign-in without duplicates, wrong-email recovery, expiry/revocation/replay, concurrent send limits, refresh persistence and callback cleanup with no redirect loops. Test same-tab PKCE after satisfying Preview protection. Real inbox delivery and physical-device/assistive-technology checks remain unverified.

## Security, accessibility, privacy and cost

Only hashes persist in the database; invitation token material is limited to server memory, the recipient email and tab-scoped continuation. No token/hash is returned to the inviter. Server-only RPC grants and authoritative ownership/rate checks remain intact. Existing pending hashes are preserved. RLS and synthetic pgTAP tests cover household boundaries; UI mocks are not presented as RLS evidence.

The existing Resend account's metadata snapshot showed 0/100 daily and 0/3,000 monthly email usage, a verified sending domain, and open/click tracking disabled. No quota was reserved. The Edge API credential, approved sender and application origin are not configured by this task. Release must confirm their secure presence and shared quota without exposing values. No new provider, plan or spending limit is approved: A$0/month and A$0/year incremental subscription cost.

Automated browser accessibility covers the invitation route. Complete WCAG conformance, screen-reader and physical-device coverage are not claimed. Staged/committed content is scanned before publication.

## Release and rollback

The PR does not deploy Production. Main merges automatically deploy Vercel while protected database/Edge releases can lag. Keep delivery disabled until all versions and configuration align. Never fall back to inviter-side OTP if the new function is unavailable.

Required separate approvals: authentication/security review, merge, exact-SHA protected **Production database release**, protected Edge Function release and delivery enablement. After merge, release the exact approved `main` SHA, verify migration history and dry-run, apply the new immutable migration, release the function, then enable only after approved isolated validation and configuration/quota review. The runbook contains the coordinated sequence.

Disable delivery first on failure; use a new forward migration for released schema fixes. Do not restore the old token-returning RPCs or browser OTP implementation as rollback. Keep acceptance and member management working. No merge, auto-merge, deployment or production release is authorised by this handover.

## Readiness

The scoped draft is ready for engineering review once exact-head required CI is green. Hosted validation and human release prerequisites remain pending. No later package is started and automated pickup remains untouched.
