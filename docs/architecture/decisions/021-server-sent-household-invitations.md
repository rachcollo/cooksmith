# ADR 021: Server-sent household invitations

- Status: Proposed
- Date: 2026-11-17
- Package: [CS-112](../../../engineering/ready/cs112-server-sent-invitations.md)

## Context

The inviter browser previously received a raw invitation token and called Auth OTP with account creation enabled for someone else's email. The approved product decision is dedicated Resend delivery with recipient-initiated, verified signup.

## Decision

Use a JWT-authorised database send reservation, followed by an Edge-only token claim and delivery through the existing Resend account. Client RPCs return only an attempt ID. Database locks and rolling recipient/household limits constrain all reservations, including failures. Claims are service-only, single-use and expire after one minute; the recorded owner is rechecked. Only token hashes persist. Retain existing pending hashes until a recipient accepts or an owner resends/cancels.

Opening a link is passive. Explicit acceptance starts existing authentication, and membership requires the current verified account email to match. Recipient tokens are kept in tab session storage during auth, rather than embedded in auth return URLs.

## Alternatives

Supabase Auth invite-email and inviter-side OTP violate the account-creation decision. A durable raw-token queue would broaden credential storage and background-job scope. Direct synchronous delivery without database reservation would leave retries and distributed rate limits dependent on browser/server memory.

## Consequences

Provider delivery and database commits are not atomic. Uncertain delivery is surfaced safely; bounded resend rotates the link. A process interruption requires an owner retry after cooldown. There is no scheduled retry or provider webhook. Tab storage enables same-browser PKCE continuation; reopening the email recovers a lost tab.

## Security impact

Private definer functions have empty search paths and explicit grants. Owner identity is derived from `auth.uid()` at reservation, never a request body. Service claims consume that recorded authorisation and recheck membership. Token hashes are removed from owner SELECT grants. Logs/errors contain no recipient or provider payload. Existing verified-email acceptance is hardened to check `email_confirmed_at` and reject anonymous accounts explicitly.

## Cost impact

A$0/month and A$0/year in new subscriptions or approved increases. Existing Resend capacity is shared with Auth; configured quota and tracking must be reviewed before release. Exceeding the existing plan requires a separate decision.

## Migration impact

One forward migration adds the RLS-protected attempt log, changes create/resend return contracts and grants, and hardens acceptance. Existing pending invitations are preserved. Merge automatically deploys Vercel; delivery stays disabled until the approved exact-SHA database and Edge releases are coordinated. No hosted deployment is part of this PR.

## Product Principles supported

Protect household trust, remove invisible coordination work and keep joining calm and explicit. Emails identify the inviter using their stored profile name and the household. Removing inviter name capture in a separate onboarding package needs a product decision about the resulting generic label.

## Rollback or reconsideration trigger

Disable delivery first on failures or abuse. Never restore inviter-side OTP or raw-token results. Forward-fix immutable migrations. Reconsider a queue only if approved delivery reliability requirements exceed manual bounded retries.
