# Engineering Package — CS-92: Unified low-click email authentication

## Metadata

- **Milestone:** Authentication & Users
- **Jira issue:** CS-92
- **Epic:** CS-1 — Authentication & Users
- **Status:** `Ready`
- **Implementation branch:** `feat/cs-92-unified-email-auth`
- **Depends on:** CS-9 authentication foundation and the existing onboarding/profile provisioning flow
- **Package path:** `engineering/planned/cs92-unified-email-auth.md`

## Product Outcome

Give every person one clear **Continue with email** path. If the email already belongs to a Cooksmith user, the link signs them in. If it is new, the same request creates and confirms the account through Supabase Auth and then sends the person into the minimum required onboarding.

The experience must not ask people to understand whether they need “sign in”, “sign up” or a “magic link” before Cooksmith can help them. It must also preserve account-enumeration protection: Cooksmith never confirms whether a submitted address is registered.

## Current Baseline

At baseline commit `6ff417394f156e3b1f7b50cb37a1a45561fb4c26`, the Welcome page offers three choices: **Email me a magic link**, **Sign in with a password**, and **Create an account**. The magic-link path calls `signInWithOtp` with `shouldCreateUser: false`. For an unregistered email, Supabase deliberately gives an enumeration-safe response but sends no email, so the UI reports success even though the user has no viable next step.

The callback bootstrap reads an authorisation code from `/auth/confirm`, calls `exchangeCodeForSession`, removes the code from browser history and fails the application bootstrap when the exchange cannot produce a session. `AuthCallbackError` tells every failed user to request another magic link in the same browser. `EmailConfirmationPage` also routes an unauthenticated callback to **Request another link**. This can create an expired/retry loop and is not contextual for a newly confirmed account whose session exchange failed.

A production defect was reproduced on 23 August 2026: a first-time user created an account, opened the verification email from Outlook on iOS, and Outlook handed the link to Safari. Supabase verified the account, but Cooksmith then displayed `pkce_exchange_failed` because Safari did not contain the PKCE verifier created in the browser context that initiated signup. This is an expected limitation of PKCE code exchange, but it is not an acceptable Cooksmith user journey. Cross-browser and email-client browser hand-off must be a supported primary path, not merely a recovery test.

The accepted onboarding gate already routes an authenticated user with incomplete onboarding to `/onboarding` and a completed user into the application. Profile and household writes must remain idempotent and household-safe.

Implementation must start from the latest accepted `main`, revalidate this baseline, and follow the Product Principles, AIEOS lifecycle, Codex build rules and authentication, database, testing, accessibility, security and release standards.

## Scope

### Included

- Rename and reposition the email option as a unified **Continue with email** journey.
- Permit account creation in the email OTP request.
- Keep password sign-in and password account creation available as secondary paths.
- Neutral request/success copy that cannot reveal whether an account exists.
- One callback and post-auth routing contract for returning and first-time email users.
- Supabase email templates for signup confirmation and passwordless email continuation use `{{ .TokenHash }}` and route to the canonical `/auth/confirm` endpoint with an allow-listed `type`.
- The password-recovery template uses `{{ .TokenHash }}` with `type=recovery`, and `/auth/reset-password` verifies it without browser-local PKCE state.
- `/auth/confirm` verifies token-hash email links with Supabase `verifyOtp()` so the flow does not depend on browser-local PKCE state.
- A bounded compatibility path for already-issued PKCE `code` links during rollout, without allowing the legacy path to remain the default.
- Safe preservation of an internal `returnTo` destination.
- Contextual invalid, expired, reused and failed-session recovery without callback/retry loops.
- Idempotent onboarding/profile/household provisioning under callback refresh or duplicate invocation.
- Privacy-safe auth telemetry and complete automated/browser coverage.
- Preview and Production verification for existing and genuinely new synthetic users, including cross-browser/in-app-browser link opening.
- A skippable final onboarding action lets email-link users create a password while already authenticated, without making password creation mandatory.

### Explicitly Out of Scope

- Social identity providers, passkeys, MFA, phone authentication or identity linking.
- Removal of password authentication.
- A general onboarding redesign beyond the optional password action on the existing completion step.
- Custom SMTP or a broad email-template redesign.
- Changes to Supabase as identity authority.
- Automatically merging users, households or multiple email identities.
- Exposing account existence to make errors appear more specific.

## Authentication and Routing Contract

### Email request

1. The user chooses **Continue with email**, enters the email once and submits once.
2. Cooksmith calls the existing Supabase OTP API with `shouldCreateUser: true` and an approved callback URL.
3. The page always returns bounded neutral copy such as: “If this address can receive a Cooksmith email, use the link to continue.”
4. Cooksmith does not branch response copy, status, timing or telemetry properties on whether the address already existed.
5. Resend/rate-limit behaviour prevents repeated accidental requests while still giving a clear recovery path.

### Callback

1. Make a token-hash email callback the required default for signup confirmation and passwordless email continuation. Accept only `token_hash`, an allow-listed email verification `type`, and a validated internal destination.
2. Verify the token hash with `supabase.auth.verifyOtp({ token_hash, type })` and establish the authenticated session without relying on the requesting browser's locally stored PKCE verifier.
3. During a bounded rollout window, recognise an already-issued `code` callback and use `exchangeCodeForSession` only as a compatibility path. Remove this path when issued legacy links can no longer be valid.
4. Never accept both callback contracts ambiguously; reject malformed, duplicated, mismatched or unsupported parameter combinations.
5. Establish or recover the authenticated session without exposing codes, token hashes, PKCE details or provider errors.
6. Remove sensitive one-time callback parameters from browser history as soon as safely possible.
7. Resolve the destination from authenticated application state:
   - incomplete onboarding/profile state → `/onboarding`;
   - completed onboarding state → validated internal `returnTo` or the application home.
8. Refresh, duplicate opening and already-consumed links must fail safely. They cannot duplicate profile, household or membership records.
9. The implementation must prove that a link requested in one browser and opened from Outlook, Apple Mail or an in-app email client into Safari/WebKit can establish a session through the token-hash contract. Do not weaken token verification, persist token hashes, or expose them beyond the one-time callback URL.

### Recovery

- Password reset links must work when requested in one browser and opened from an email app in another browser.
- A verified recovery link must establish a recovery session and open **Choose a new password** directly.
- Password reset requests use the same enumeration-safe response whether or not an account exists.
- Invalid, malformed, expired or reused link: explain that the link cannot be used and offer **Send a new email** plus a secondary route back to sign in.
- Email confirmed but no session established: route to a valid sign-in option and explain that the email is confirmed; do not keep resending an account-creation-incompatible link.
- Stale `/auth/confirm` navigation without callback material: clear callback state and return to the unified email entry point.
- Provider/internal error: show calm bounded copy with an internal correlation/category available to telemetry, never raw Supabase details.
- Recovery actions must replace stale history where appropriate so Back/Retry cannot recreate the loop.

## Functional Requirements and Acceptance Criteria

### FR-1 — One low-click email entry

- [ ] The primary email action is labelled **Continue with email**.
- [ ] A user does not choose sign-in versus signup before submitting an email.
- [ ] The email OTP request permits creation of a new user.
- [ ] Existing users receive a usable sign-in link.
- [ ] New users receive a usable continuation link and are created only through the approved Supabase flow.
- [ ] Password sign-in and password account creation remain available as secondary alternatives.
- [ ] Busy, success, rate-limit and failure states prevent accidental duplicate requests and preserve the entered address where safe.

### FR-2 — Enumeration-safe communication

- [ ] Request and success copy does not reveal whether an account exists.
- [ ] Observable response shape, user-facing state and analytics do not deliberately distinguish registered and unregistered addresses.
- [ ] No “account not found”, “new account created” or equivalent pre-auth disclosure is introduced.
- [ ] Email addresses are not recorded in product analytics or ordinary application logs.
- [ ] Automated tests assert the same neutral UI contract across existing-user, new-user and provider-enumeration-safe responses.

### FR-3 — Correct first-time and returning-user destinations

- [ ] A returning user with complete onboarding reaches the validated internal destination or application home.
- [ ] A first-time user reaches onboarding without returning to authentication.
- [ ] The existing onboarding gate remains the source of truth for completion, rather than relying only on mutable auth metadata or account creation timestamps.
- [ ] `returnTo` accepts internal allow-listed application paths only; absolute, protocol-relative, encoded and malformed external destinations are rejected.
- [ ] Callback refresh or duplicate opening cannot create duplicate profiles, households or memberships.
- [ ] Interrupted onboarding remains resumable through its current persisted state.

### FR-4 — Reliable callback and recovery

- [ ] Signup-confirmation and passwordless email templates emit token-hash links to the canonical `/auth/confirm` route rather than making PKCE code exchange the default.
- [ ] `/auth/confirm` allow-lists the verification type and calls `verifyOtp()` with the token hash; the handler does not require the originating browser's PKCE verifier.
- [ ] Same-browser and approved cross-browser/in-app-browser email opening are covered by the token-hash callback contract.
- [ ] A first-time user can request signup in one browser, open the email from Outlook on iOS into Safari, receive a session and reach onboarding without seeing `pkce_exchange_failed`.
- [ ] Already-issued legacy `code` links have a bounded, tested compatibility path during rollout; malformed mixed callback parameters fail closed.
- [ ] Invalid, expired, reused, malformed and missing callback parameters produce distinct internal categories but calm, actionable user copy.
- [ ] Sensitive callback parameters are removed from browser history and are absent from logs, telemetry and screenshots.
- [ ] A confirmed user whose session exchange fails receives a valid sign-in route rather than an endless resend loop.
- [ ] **Send a new email** uses the unified flow and never returns an unregistered user to `shouldCreateUser: false`.
- [ ] Browser Back, refresh and repeated recovery actions do not recreate the expired-link screen loop.
- [ ] No raw PKCE, Supabase, token, code or stack error is shown.

### FR-5 — Security, privacy and observability

- [ ] Supabase remains authoritative for identity and token verification.
- [ ] Authentication success does not itself grant access to another household; existing household membership and RLS boundaries remain enforced.
- [ ] Telemetry records only bounded events and categories: request outcome, callback outcome category, onboarding/application destination class and recovery action.
- [ ] Telemetry and logs exclude email, token, authorisation code, PKCE verifier, complete callback URL and sensitive auth metadata.
- [ ] Production requests use `https://app.smillins.com.au/auth/confirm`; allow-listed Preview requests return to their requesting Preview origin.
- [ ] Redirect construction is covered against open redirects and unapproved origins.
- [ ] No new client-visible secret or privileged key is introduced.

### FR-6 — Accessibility and product quality

- [ ] The flow uses Australian/UK English and plain language rather than authentication jargon.
- [ ] Email field, errors, status and actions have semantic labels and associations.
- [ ] Busy and callback progress use non-disruptive status announcements.
- [ ] Error recovery moves focus predictably and does not rely on colour.
- [ ] All actions are keyboard operable, retain visible focus and meet the 44px touch-target baseline.
- [ ] Supported 320px, 390px, tablet and desktop widths have no horizontal overflow.
- [ ] Reduced-motion and forced-colour/high-contrast modes remain usable.

### FR-7 — Optional onboarding password

- [ ] The existing onboarding completion step offers **Create a password** and **Skip for now**.
- [ ] Password creation is optional and does not block email-link users from entering Cooksmith.
- [ ] A password entered while authenticated is updated through Supabase Auth without sending another email.
- [ ] Password and confirmation must match and meet the configured minimum requirements.

## Data, Security and Privacy

No database migration is expected for the core change. Before implementation, confirm whether existing profile/household provisioning has uniqueness constraints and transaction/idempotency protection adequate for duplicate callback/onboarding execution. If a confirmed gap requires a database change, use only an additive forward migration, preserve existing data, update generated types and add pgTAP/RLS evidence.

Do not infer “new user” solely from `created_at`, email confirmation time or client-held flags. Use the authenticated user's durable Cooksmith onboarding/profile state. Do not create a household during the pre-auth email request.

Use synthetic addresses and identities for tests. Never commit a real confirmation link, token, code, verifier, production email or copied auth log.

## Technical Direction

- Change `src/app/auth/AuthProvider.tsx` so the unified email action opts into supported account creation.
- Update the applicable Supabase **Confirm signup**, **Magic Link** and **Reset password** email templates to use token-hash links, with the equivalent explicitly allow-listed Preview origin only where required by the environment contract.
- Implement a typed `/auth/confirm` parser that accepts the token-hash contract, allow-lists `type`, invokes `verifyOtp()`, sanitises browser history, and treats legacy `code` exchange only as a time-bounded compatibility path.
- Refine `src/routes/auth/AuthPages.tsx` so Welcome, email request, confirmation and recovery copy/actions form one coherent journey while password paths remain available.
- Refactor `src/application/auth/initialSession.ts` and `src/application/auth/bootstrapAuth.ts` only as needed to represent safe callback outcomes and clear sensitive URL state.
- Replace the blanket same-browser resend advice in `src/app/errors/AuthCallbackError.tsx` with category-aware recovery that does not expose implementation details.
- Reuse `safeReturnPath`, `OnboardingGate` and the existing onboarding repository; strengthen them only where tests reveal a contract gap.
- Prefer typed auth outcome and recovery-category unions over matching raw provider error strings in presentation code.
- Keep rate-limit/retry policy bounded. Do not automatically send multiple emails from callback recovery.
- Do not add a dependency unless the current Supabase client and routing primitives cannot satisfy the accepted contract; any dependency must be exact-versioned and justified.
- Record an ADR only if the chosen callback method creates a durable architecture decision not already covered by accepted auth reports/ADRs.

## Test Plan

### Unit and component tests

- OTP options use `shouldCreateUser: true` and the correct environment callback.
- Internal safe-return validation rejects absolute, protocol-relative, encoded and malformed external destinations.
- Token-hash callback parsing and `verifyOtp()` cover success, invalid, expired, reused, missing hash, unsupported type and unexpected failure without exposing raw errors.
- Legacy PKCE-code compatibility covers success and missing verifier without making same-browser PKCE the required email journey.
- Mixed `code`/`token_hash`, duplicated and malformed callback parameters fail closed.
- Welcome/email/recovery copy and links match the unified contract.
- Existing and new email request results render the same enumeration-safe state.
- Focus, accessible names, error association, busy state and live status behaviour.

### Integration tests

- Existing completed user → email request → callback → intended application route.
- New email user → callback → authenticated incomplete state → onboarding.
- Confirmed/incomplete user resumes onboarding.
- Same callback invoked twice and callback refresh do not duplicate profile, household or membership data.
- Expired/reused/malformed/stale callback recovers without a route loop.
- Confirmed-email/session-exchange failure returns to a valid password/email sign-in choice.
- Password sign-in, password signup, password reset and invitation authentication remain intact.
- Unauthenticated and unrelated users retain existing household isolation.

### Browser, responsive and hosted tests

- Chromium/WebKit representative desktop and mobile flows at 320px and 390px.
- Request and open links in the same browser and a separate/in-app browser context using synthetic accounts.
- Reproduce the reported iOS hand-off: initiate first-time signup outside Safari, open the confirmation from Outlook, allow Outlook to hand off to Safari/WebKit, and prove the user reaches onboarding with no `pkce_exchange_failed` screen.
- Browser Back, refresh, reused link, expired link and fresh-email recovery.
- Preview link returns to the originating allow-listed Preview; Production link returns only to `app.smillins.com.au`.
- Keyboard-only completion, focus recovery, axe, forced colours and no horizontal overflow.
- Confirm no callback secret remains visible in history, screenshots, analytics or application logs after handling.

Live email delivery and one-time-link handling must be verified in hosted Preview/Production-like environments; unit mocks alone are insufficient.

## Quality Gates

- [ ] `npm ci` and `npm run preflight` complete from the supported baseline.
- [ ] `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` pass.
- [ ] Documented-command audit, whitespace and credential/secret checks pass.
- [ ] Applicable database reset, lint, pgTAP and generated-type checks pass if persistence changes.
- [ ] Auth unit, integration, browser, callback, redirect and regression suites pass.
- [ ] Playwright, axe, responsive, keyboard and history/navigation coverage pass.
- [ ] Hosted Preview verifies existing/new user, same/cross-browser callback and all recovery paths with synthetic accounts.
- [ ] Production configuration/link-origin evidence is recorded without exposing complete links.
- [ ] PR governance, Jira evidence, release declarations, completion report and handover are complete.

## Definition of Done

- [ ] Every Jira and package criterion is implemented and evidenced without excluded scope.
- [ ] One email action supports both returning and first-time users with no account-existence disclosure.
- [ ] New users reliably reach onboarding and returning users reach Cooksmith.
- [ ] Expired, reused, stale and failed-session states recover without loops.
- [ ] Password paths and household security remain intact.
- [ ] Callback secrets are absent from history, logs, telemetry and repository evidence.
- [ ] Accessibility, responsive, security and privacy obligations are satisfied.
- [ ] Required GitHub Actions and hosted verification pass.
- [ ] Jira can progress through AIEOS using the package, PR and release evidence.

## Implementation Sequencing

1. Reconfirm current auth, callback, onboarding, routing and provisioning contracts on latest `main`.
2. Add regression tests reproducing the unregistered-email silent success and expired/retry loop.
3. Define typed request, callback outcome, destination and recovery contracts.
4. Enable supported account creation for the unified email request and update the Welcome/email UI.
5. Implement token-hash `verifyOtp()` callback/session handling, bounded legacy-code compatibility, and internal destination routing for existing and new users.
6. Deploy the compatible callback handler before changing Supabase email templates; then update Confirm signup and Magic Link templates and verify canonical Production/Preview origins.
7. Implement category-aware recovery and stale-history clearing.
8. Prove provisioning idempotency; add the smallest database safeguard only if the accepted schema lacks it.
9. Complete unit, integration, browser, responsive, accessibility and security checks.
10. Validate real email delivery and same/cross-browser links in hosted Preview, then verify the Production origin with fresh synthetic accounts.
11. Record exact evidence and release declarations in the implementation PR and Jira.

## Release, Rollback and Cost

- **Expected migration:** None. Confirm profile/household idempotency against latest `main`; any required additive safeguard must be declared, tested and released through the protected database workflow.
- **Expected Edge Function:** None.
- **Supabase configuration/template change:** Required. Update **Confirm signup** and **Magic Link** to use `{{ .TokenHash }}` and the canonical `/auth/confirm` route. Update **Reset password** to use `{{ .TokenHash }}` with `type=recovery` and the requested `/auth/reset-password` redirect. Re-verify the Production Site URL and redirect allow-list. Capture redacted before/after evidence. Roll template changes out with the compatible application callback handler already deployed so existing and newly issued links remain safe.
- **Application release:** Human-approved merge to `main`.
- **Rollback:** Revert the application change to restore the previous separate flows. Do not edit accepted migrations. If an additive safeguard was released, preserve it and forward-fix.
- **New dependency/provider:** None expected.
- **Recurring cost:** A$0/month and A$0/year.
- **Secrets:** No new secrets. Existing Supabase public client configuration remains subject to current controls; service-role and auth tokens must never enter browser code or evidence.

## PR Requirements

Package PR title: `chore(package): CS-92 — Unified low-click email authentication`

Implementation PR title: `CS-92: Unify email sign-in and signup`

Both PRs must link [CS-92](https://smillins.atlassian.net/browse/CS-92) and this package. The implementation PR must state the baseline commit, changed files, primary/recovery journeys, exact test results, hosted same/cross-browser evidence, migration/Edge/config declarations, Production callback origin, rollback, security/privacy/accessibility review and A$0 recurring cost.
