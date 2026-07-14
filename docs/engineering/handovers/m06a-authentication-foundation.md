# Milestone 6A handover

Milestone 6A introduces identity and protected routing only. Continue to use the Milestone 5 RLS model for authorisation. Do not infer a profile or household from an Auth user; Milestone 6B owns those lifecycle steps.

Before 6B, verify hosted confirmation, magic-link, recovery, refresh, and logout flows using the environment-specific redirect allowlist and Resend SMTP settings documented in `docs/engineering/v2/authentication.md`.
