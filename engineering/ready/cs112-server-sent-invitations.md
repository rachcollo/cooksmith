# Engineering Package CS-112: Send household invitations from the server with a clear invitation email

## Metadata

- **Jira issue:** `CS-112`
- **Jira link:** https://smillins.atlassian.net/browse/CS-112
- **Epic:** Households (CS-2)
- **Priority:** Highest
- **Status:** `Ready`
- **Branch:** `feat/cs-112-server-sent-invitations`
- **Depends on:** None
- **Blocks:** None
- **Package path:** `engineering/ready/cs112-server-sent-invitations.md`
- **Source:** Four-reviewer review, 17 November 2026, findings C1 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

An invited person receives an email that names the inviter and the household, and no account is created for them until they act. A member can no longer use Cooksmith to send sign-in emails to arbitrary addresses.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- `deliver()` calls `client.auth.signInWithOtp({ email: invitee, shouldCreateUser: true })` from the inviter's browser (`src/infrastructure/households/supabaseHouseholdPeopleRepository.ts:34-41`).
- `create_household_invitation` and `resend_household_invitation` return the raw `invitation_token` to that browser.
- The recipient receives `supabase/templates/magic-link.html`, which does not mention an invitation, inviter or household. Settings shows "Invitation sent."
- `accept_household_invitation` already requires the signed-in user's verified email to match.

## Scope

### Included

- Server-side delivery of invitation email with a dedicated template.
- Removal of the raw token from client-facing RPC results.
- Rate limits on create and resend per household and per recipient.
- Safe handling of existing pending invitations.

### Explicitly Out of Scope

- Changes to roles or member removal.
- Shareable invitation links without email.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] Invitation email is sent server-side using a dedicated template naming the inviter's display name and household.
- [ ] No client code calls `signInWithOtp` for an address other than the signed-in user's own entry.
- [ ] The raw token is never returned to the inviter's client; only a hash is stored.
- [ ] Create and resend are rate limited per household and per recipient.
- [ ] Acceptance still requires the verified email to match the invitation.
- [ ] Existing pending invitations continue to work or are reissued without owner effort.
- [ ] pgTAP and function tests cover non-owner, cross-household, rate-limit and wrong-email cases.

## Technical Direction

- Prefer an Edge Function invoked by the client with the user JWT; it verifies ownership through an RPC and sends the email with a server-held credential.
- Keep `/invitations/accept?token=` as the landing route; the token appears only in the email link.
- Record send attempts for rate limiting in a household-scoped table with RLS.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- pgTAP: token never selectable by authenticated role; rate-limit behaviour; cross-household denial.
- Function unit tests with a stub mailer.
- Integration: Settings invite, resend and cancel flows.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Yes: invitation send log, RPC result change.
- **Expected Edge Function:** Yes: new invitation delivery function.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** Depends on the delivery decision below. Option A is A$0. Option B needs cost approval before build.

## Deferred Work and Open Questions

- Delivery mechanism. Option A: Supabase Auth invite email from the function (no new provider, A$0, but an auth record in invited state is created at send time). Option B: a transactional email provider (meets "no account until they act" exactly; recurring cost and approval required). The Jira criterion as written needs Option B; confirm or relax it.
- Security-sensitive authentication change: human approval is required before release.

## Pull Request

Title: `CS-112: Send household invitations from the server with a clear invitation email`
