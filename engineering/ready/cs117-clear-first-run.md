# Engineering Package CS-117: Make the first run clear: welcome, sign-up errors and a short onboarding

## Metadata

- **Jira issue:** `CS-117`
- **Jira link:** https://smillins.atlassian.net/browse/CS-117
- **Epic:** Beta Launch (CS-8)
- **Priority:** High
- **Status:** `Ready`
- **Branch:** `feat/cs-117-clear-first-run`
- **Depends on:** CS-92
- **Blocks:** None
- **Package path:** `engineering/ready/cs117-clear-first-run.md`
- **Source:** Four-reviewer review, 17 November 2026, findings N1, N2, N4, N9 (`docs/engineering/reports/2026-11-17-four-reviewer-review.md`)

## Product Outcome

A new visitor understands what Cooksmith is, creates an account without guessing the rules and reaches Home after two questions.

## Current Baseline

Verified against `main` at `17b9c47`. Re-verify before editing; line numbers will move.

- Welcome copy and action order (`src/routes/auth/AuthPages.tsx:36-47`).
- Password hint "Use at least 10 characters" (`:169`) against `password_requirements = "letters_digits"` (`supabase/config.toml:68`); generic fallback message (`src/app/auth/authErrors.ts:12`).
- Five onboarding steps (`src/routes/onboarding/OnboardingPage.tsx:119-123`) with free-text timezone (`:96-102`) and seven planning preferences (`:183-256`) that no feature reads.
- Dietary step returns silently on invalid input (`:328`).
- Footer line (`src/app/layout/RootLayout.tsx:108`).
- CS-92 (In Review) reworks the entry journey.

## Scope

### Included

- Welcome copy and a single primary action.
- Password rule hint and specific error messages.
- Onboarding reduced to household name and allergies or dietary needs.
- Unused preferences moved to Settings as optional.
- Visible errors on every step.
- Removal of inaccurate copy.

### Explicitly Out of Scope

- Feature teaching during onboarding (CS-60).
- Auth mechanism changes beyond CS-92.
- Starter pantry or recipes.

## Acceptance Criteria

Summarised from Jira, which remains authoritative.

- [ ] The welcome screen states in one sentence what Cooksmith does and leads with one primary action for new and returning users.
- [ ] The password rule shown matches the enforced rule.
- [ ] Weak password and existing account produce specific, safe messages.
- [ ] Onboarding asks only for household name and allergies or dietary needs before Home; timezone is detected.
- [ ] Preferences no feature uses are optional in Settings and existing saved values are preserved.
- [ ] Every onboarding step shows a visible error when it cannot continue.
- [ ] No copy claims privacy or planning behaviour the product does not provide.

## Technical Direction

- Onboarding completion is derived in `supabaseOnboardingRepository` and the bootstrap RPCs; check whether the completion rule lives in SQL before changing step count.
- Do not reveal whether an email is registered beyond what Supabase already discloses.
- Confirm the hosted auth password policy and mirror it.

## Security, Privacy and Accessibility

- Household data stays household scoped; RLS is not weakened; server-side authorisation remains authoritative.
- New or changed interactive controls are keyboard operable, have accessible names and meet WCAG 2.2 AA.
- No credentials, real household data or environment files are committed.

## Test Plan

- Integration: `auth-email-flow`, `onboarding` suites updated.
- pgTAP: onboarding bootstrap if the completion rule changes.
- Playwright: sign-up to Home on mobile with axe.

Run the full quality suite required by `docs/engineering/CODEX_BUILD_RULES.md` and `docs/engineering/TESTING_STANDARDS.md`.

## Release, Rollback and Cost

- **Expected migration:** Possible: onboarding completion rule. Confirm during build.
- **Expected Edge Function:** None.
- **Rollback:** Revert application changes; forward-fix any released schema.
- **Recurring cost:** A$0/month and A$0/year.

## Deferred Work and Open Questions

- Proposed welcome sentence for approval: "Plan the week's dinners, build the shopping list and see what is already in your pantry."
- Rebase on CS-92 once merged; if CS-92 changes the welcome page, keep its structure and apply only the copy and error criteria.

## Pull Request

Title: `CS-117: Make the first run clear: welcome, sign-up errors and a short onboarding`
