# Household invitations and member management

## MVP model

Cooksmith MVP supports one active household per user. An active partial unique index on `household_members.user_id` enforces that rule independently of the client. There is no active-household selector or household switching.

Owners manage people from `/settings`. Members can see active household members but cannot invite, resend, cancel, remove, or read invitation email addresses. Invitation records are private, RLS enabled, owner-readable, and writable only through constrained RPCs.

## Invitation lifecycle

1. An active owner supplies an email address.
2. `create_household_invitation` normalises the email, rejects an active duplicate or existing member, creates a seven-day token, and stores only its SHA-256 hash.
3. The application asks the existing Supabase Auth email channel to deliver a one-time sign-in link through configured Resend SMTP. The allowed `/auth/confirm` PKCE callback safely returns to `/invitations/accept` with the separate invitation token.
4. The authenticated invitee supplies a display name. `accept_household_invitation` locks the invitation, reads the caller and verified email from `auth.users`, matches the email, rejects invalid, expired, cancelled, accepted, or cross-account attempts, and creates an active `member` membership.
5. Acceptance completes the invited member's profile without running first-household onboarding. Reuse of the invitation is denied.

If email delivery fails after the invitation is stored, the UI explains that the owner can use **Resend**. Resending rotates the token and expiry, invalidating the previous link. Cancelling makes the invitation terminal.

## Security boundary

Privileged implementations live in `cooksmith_private`, use `security definer`, set an empty `search_path`, fully qualify objects, derive the caller from `auth.uid()`, and accept no caller-supplied user ID or role. Exposed `cooksmith` wrappers remain security invoker. `PUBLIC` and `anon` execution are revoked.

Invitation email is a delivery and identity-matching attribute, never a general household authorisation source. The accepting identity comes from `auth.users`, not JWT user metadata or frontend state. Global application roles do not grant household invitation access.

Membership identifiers cannot be changed. Acceptance always assigns `member`. Removal marks the row inactive, immediately failing existing RLS helper checks. A database trigger prevents removal or demotion of the final active owner, including direct owner-authorised writes outside the management UI.

## Operations

| Operation                         | Owner                         | Member | Unrelated/inactive |
| --------------------------------- | ----------------------------- | ------ | ------------------ |
| List active members               | Allow                         | Allow  | Deny               |
| List invitations                  | Allow                         | Deny   | Deny               |
| Create/resend/cancel invitation   | Allow                         | Deny   | Deny               |
| Accept matching active invitation | If not already in a household | Same   | Same               |
| Remove active member              | Allow, except final owner     | Deny   | Deny               |

## Release and provider notes

No new dependency, email provider, server secret, custom domain, or recurring cost is introduced. Supabase Auth rate limits continue to apply. Real inbox delivery remains provider-dependent; Microsoft-hosted mailboxes may delay or quarantine messages even after Resend reports delivery.

The migration must be released through the approved production migration process before the merged UI is used. The forward-fix path is a new migration; this shared migration must never be edited after release.
