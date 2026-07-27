# CS-88 Orchard Home, Get Ahead and secondary routes handover

- **Date:** 2026-07-27
- **Branch:** `feat/cs-88-orchard-secondary`
- **Target:** `main`
- **Baseline:** `a4ec7125805d18ed0b1af797756ad4f92b316fea`
- **Implementation commit:** `eed979b8f7f841adf40c240f98a975199ca2a53c`
- **Status:** Implemented, hosted and manual validation pending

## Objective and product impact

Complete the Orchard Editorial migration across the current foundation Home, the full
Get Ahead session, Settings, onboarding, invitation acceptance, authentication and
recovery surfaces. Existing workflows, route guards, validation, accessible names and
automation identifiers remain unchanged.

## Changes made

- Restyled the current Home foundation header and three quality cards without adding the
  excluded meal dashboard.
- Applied Orchard surfaces, accent action, progress treatment and responsive checklist
  rows to the complete Get Ahead session model.
- Restyled Settings member and invitation lists while retaining all role-based actions.
- Applied Orchard display type, raised surfaces, progress treatment and responsive
  backgrounds to authentication, onboarding and invitation acceptance.
- Preserved shared dialog/sheet styling and the existing calm not-found and route-error
  recovery patterns.
- Replaced legacy, undefined radius aliases in touched Get Ahead styles with canonical
  Orchard tokens.

## Files affected

| File                                                          | Purpose                                    |
| ------------------------------------------------------------- | ------------------------------------------ |
| `src/routes/HomePage.tsx`                                     | Scoped current Home foundation composition |
| `src/routes/GetAheadPage.tsx`                                 | Orchard session and accent action classes  |
| `src/routes/InvitationAcceptancePage.tsx`                     | Focused invitation-card styling hook       |
| `src/styles/components.css`                                   | Orchard secondary-route responsive styling |
| `docs/engineering/handovers/cs88-orchard-secondary-routes.md` | Delivery and validation evidence           |

## Validation

| Command or check                          | Result      | Notes                                            |
| ----------------------------------------- | ----------- | ------------------------------------------------ |
| `npm ci` with writable npm cache          | Passed      | Exact lockfile installed                         |
| `npm run format` / `npm run format:check` | Passed      | Repository formatting clean                      |
| `npm run lint`                            | Passed      | Zero warnings                                    |
| `npm run typecheck`                       | Passed      | Strict TypeScript build                          |
| `npm run test`                            | Passed      | 50 files, 260 tests                              |
| `npm run build`                           | Passed      | Production bundle built                          |
| `npm run preflight`                       | Unavailable | Optional Supabase CLI binary unavailable locally |

The managed runner reports its existing `http-proxy` npm warning. It is not produced by
repository configuration. The unavailable preflight check remains required in CI.

## Preview and manual verification

On the exact Vercel Preview:

1. At 320 px, 390 px, 768 px, 1024 px and 1280 px, verify Home, Get Ahead, Settings,
   onboarding, invitation acceptance, auth, not-found and route-error without horizontal
   overflow.
2. Verify Get Ahead with no session, an active session, resume, completed tasks, no
   opportunities, stale tasks, alternatives, end early and start fresh.
3. Confirm duration presets/custom duration, consolidation, overrides and progress retain
   their existing results after refresh.
4. Verify owner/member Settings, pending/empty invitations, feedback and removal dialog.
5. Exercise email/password sign-in, magic link, password reset, account creation,
   onboarding, invitation acceptance, protected-route refresh and callback cleanup.
6. Keyboard through every changed route and overlay; run axe and confirm no serious or
   critical findings.

## Release, accessibility, security, privacy and cost

- **Migrations:** None.
- **Edge Functions changed:** No.
- **Production release:** Application deployment only after human-approved merge.
- **Dependencies:** None added or changed.
- **Accessibility:** Existing semantic structure, names, roles, focus management and
  44-pixel actions are preserved. Completed state remains available through the checkbox
  and text treatment. Hosted axe, keyboard and responsive verification remain pending.
- **Security and privacy:** No auth flow, route guard, permission, household boundary,
  persistence, provider or logging behaviour changed. Tests use synthetic data only.
- **Cost impact:** A$0 per month and A$0 per year.
- **Rollback:** Revert the implementation and evidence commits. No data, provider or
  configuration repair is required.

## Deferred work

The future Home meal dashboard, new Get Ahead capabilities and behavioural changes to
auth, invitation or onboarding remain outside CS-88. CS-89 may begin only after this
migration is accepted.
