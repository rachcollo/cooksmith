# User onboarding and household bootstrap

## Purpose

Milestone 6B gives an authenticated first-time user a durable profile, one household, an active owner membership, household settings, and household-level dietary and allergy defaults. It reuses Milestone 6A authentication and the Milestone 5 authorisation model. It does not implement invitations, household switching, or feature data.

## Flow and resume behaviour

`OnboardingGate` loads the authenticated user's profile, active membership, household settings, dietary requirements, and allergies. Incomplete users enter `/onboarding`; completed users enter the application frame. The five persisted steps are:

1. Profile: display name, `Australia/Melbourne`-compatible IANA timezone, and locale.
2. Household: first household name and secure bootstrap.
3. Preferences: servings, cooking-time limits, confidence, budget band, optional supermarket, and weekly planning day.
4. Dietary requirements and allergies: household defaults only.
5. Finish: mark onboarding complete and enter Cooksmith.

The profile stores the current step and completion timestamp. Each completed step persists before navigation, so a refresh or a new session resumes from the database. Repeating household bootstrap returns the user's existing active household and does not create another household or membership.

## Secure bootstrap

The public `cooksmith.bootstrap_household(text)` function is a security-invoker wrapper. It calls a private security-definer function that:

- derives the actor only from `auth.uid()`;
- uses an explicit empty `search_path` and schema-qualified objects;
- locks the authenticated user row to serialize duplicate requests;
- requires an existing profile;
- atomically creates the household, active owner membership, and default settings;
- returns the existing active household on safe retries;
- is executable only by `authenticated`.

Normal profile, settings, dietary, and allergy writes continue through the existing RLS policies. The private implementation is not exposed through the Data API.

## Data mapping

- Weekly planning cadence uses `household_settings.preferred_prep_day`.
- Optional supermarket uses `household_settings.preferred_supermarket`.
- Dietary requirements and allergies are household-scoped defaults with `membership_id` unset.
- Free-text custom entries are trimmed and de-duplicated before persistence.

The `cooksmith` schema is exposed to the authenticated Data API for this approved integration. RLS remains enabled and default-deny; exposing the schema does not grant table access by itself.

## Validation and accessibility

Zod schemas validate every step before persistence. Provider failures are translated into calm, non-sensitive messages. The interface uses semantic headings, fieldsets, labels, hints, visible focus, live error/status regions, and busy states. Step changes move focus to the onboarding panel. Automated component and integration tests cover validation, persistence, idempotent bootstrap behavior, resume, and routing. Database tests execute the real RPC and RLS model in CI.
