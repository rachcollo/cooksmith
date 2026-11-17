# Household invitations and member management

## User flow

An active owner enters an email in Settings. The `send-household-invitation` Edge Function sends a dedicated Resend email naming the inviter’s stored profile display name and household name. Delivery uses the existing account and plan. There are no Auth writes when sending, resending, previewing or opening the link.

The `/invitations/accept?token=` landing page is public and passive. It removes the token from browser history and retains it in session storage in that tab for authentication continuation. **Accept invitation** opens the existing sign-in/create-account choices. The recipient enters their own email; account creation occurs only after that explicit choice and the existing signup flow. Supabase can create an unconfirmed Auth record during explicit signup, but household membership requires completed email verification. Existing accounts authenticate without a second account. The final **Join household** action verifies the email in `auth.users`, consumes the invitation once and completes the member profile without creating a second household.

Use the same browser/tab for email verification and PKCE continuation. If session storage is unavailable, signed-out recipients receive recovery guidance. If continuation is lost, reopen the original invitation email. Incorrect accounts can sign out on the invitation screen. Invalid, expired, cancelled, rotated or consumed links cannot create membership.

## Database and service boundary

`create_household_invitation` and `resend_household_invitation` now return a send-attempt UUID only. Both call a private reservation function deriving identity from `auth.uid()`, requiring a verified non-anonymous account and active owner membership. The database checks ownership again after taking its household lock. Existing pending invitations are reused on retry. Existing pending token hashes are preserved by the migration, so previously emailed links continue to work until expiry, cancellation, use or resend.

`household_invitation_send_attempts` is RLS enabled, with no client grants or policies. Attempts include household, recipient hash, caller, timestamps and outcome; no raw token or provider payload is stored. Counts include failed and interrupted sends. Transaction locks serialise recipient and household limits:

- Recipient, across households and case variants: one attempt per minute, three per hour, five per day.
- Household: twenty per hour, fifty per day.

These rolling limits prevent concurrent duplicate sends and are authoritative even if a client bypasses the UI. They are abuse limits, not a guarantee that the shared Resend account has available quota.

The Edge Function calls the reservation RPC using the caller’s JWT, then generates a 256-bit random token in memory. Service-only `claim_household_invitation_delivery` accepts its SHA-256 hash, checks the reservation is recent and unclaimed, rechecks its recorded owner, rotates the invitation hash and returns mail context to the server. It accepts no caller identity argument. `finish_household_invitation_delivery` records only sent/failed. The privileged implementations live in `cooksmith_private` with empty search paths and minimum execution grants; exposed wrappers are security invoker.

Only a hash persists. Neither raw token nor hash is returned to the inviter. Owner SELECT grants cover only list fields; token hashes are not selectable by authenticated clients. Email, token and provider errors are not logged or returned in function responses. The recipient link necessarily contains the bearer token; deployment/provider access logs and email click tracking require review before release. The invitation route has `no-referrer` and `no-store` response headers. Existing observability scrubs URL queries.

## Failure and retry

The provider request uses a send-attempt idempotency key and a bounded timeout. Duplicate/concurrent reservations hit the database cooldown. A claim cannot be replayed. Provider rejection or timeout returns safe retry guidance and retains the invitation. Settings refreshes the pending list on failure so **Resend** is available. Resend after the cooldown rotates the token; only the newest link works. A response lost after provider acceptance is an uncertain delivery, not proof of failure. The owner may resend after cooldown, which can produce another email but cannot create another membership. A failed outcome-recording call never reports confirmed success.

No background retry job, scheduled automation, account precreation or Supabase Auth invite-email API is used. Cancellation may race with a provider request already in flight; the recipient may receive an unusable link, but cancellation still prevents acceptance.

## Policy matrix

| Operation                              | Owner                                                   | Member / unrelated / inactive | Anonymous |
| -------------------------------------- | ------------------------------------------------------- | ----------------------------- | --------- |
| List active members                    | Allow                                                   | Active member only            | Deny      |
| Read invitation list fields            | Own household                                           | Deny                          | Deny      |
| Read token hashes / send-attempt table | Deny                                                    | Deny                          | Deny      |
| Reserve send / resend                  | Verified active owner, limited                          | Deny                          | Deny      |
| Claim token / record delivery          | Service only                                            | Deny                          | Deny      |
| Accept invitation                      | Matching verified recipient without an active household | Same                          | Deny      |
| Remove member                          | Existing final-owner safeguards                         | Deny                          | Deny      |

## Configuration and quota

Server-only required variables: `RESEND_API_KEY`, `INVITATION_FROM_EMAIL`, `INVITATION_APP_ORIGIN`, `HOUSEHOLD_INVITATIONS_ENABLED`; standard function variables are `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. None belongs in Vite/browser environment variables. The API credential must have permission to send from the existing verified domain; SMTP configuration alone does not prove that an Edge API credential exists. The origin must be one approved HTTPS origin without a path, credentials or trailing slash. It is never taken from request input. Enablement must be exactly `true`; absent configuration fails closed before reservation or send.

A metadata-only Resend check on 17 November 2026 reported 0/100 daily emails, 0/3,000 monthly emails, one domain and 10 requests per second. This snapshot is not a reserved budget. Auth and invitations share capacity. No plan, quota, subscription or spending limit was changed. Incremental approved recurring cost is A$0/month and A$0/year; release must stay within the existing plan. The verified sending domain had open/click tracking disabled in that snapshot. API-key presence, approved sender/origin and remaining shared quota must be confirmed without printing values before enablement. Credentials were not obtained or fabricated in this implementation.

## Coordinated release and rollback

This PR does not deploy Production. Preview currently shares Production Supabase configuration, so hosted Auth/database writes are not approved validation. Use an explicitly authorised isolated staging project for the flows below.

1. Review the exact candidate SHA, required CI, synthetic isolated tests, provider configuration/quotas and human authentication approval. Confirm backup/forward-fix ownership and a coordinated release window.
2. Obtain separate merge, protected database release and Edge Function release approvals. A merge automatically deploys Vercel, while database/Edge releases may lag. Keep invitation delivery disabled until all three versions are compatible; the new UI fails safely if the function is absent. Communicate temporary invitation unavailability. Old frontend send RPC calls intentionally cannot retain token access after the migration.
3. After merge, use the protected **Production database release** workflow for the exact approved `main` SHA, with mandatory dry-run and migration-history verification. Apply `20261117105847_cs112_server_sent_invitations.sql` only through that approved workflow.
4. Release `send-household-invitation` through the protected Edge Function workflow for that same approved SHA. Review sender, HTTPS origin, secrets, tracking and quota; keep enablement off until isolated validation and release approvals are complete. Do not change Auth settings as part of this PR.
5. Only the authorised release operator enables delivery and performs separately approved synthetic hosted checks. Confirm no account on send/open, correct names, verified signup, existing-user acceptance, wrong-account recovery, replay rejection and callback cleanup without refresh loops.

Disable delivery by removing its enablement first if provider delivery or security fails. Do not restore the old browser OTP sender as a rollback: it reinstates the original vulnerability. Revert compatible UI changes only with delivery disabled; released migrations are immutable and require forward fixes. Existing acceptance links and member management should remain available.
