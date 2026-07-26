# Implementation plan — Orchard Editorial

Ship as **several controlled PRs**, not one whole-app rewrite. Each package lists the
files expected to change and its acceptance criteria. A package must be green
(`npm run validate`) before the next begins. Nothing here changes product behaviour;
any `[PRODUCT]` item from `06-route-build-notes.md` is a separate, pre-approved PR.

---

## Phase 1 — Foundations: fonts, tokens, global type & shape
**Changes:** `package.json` (+ Fontsource deps), `src/main.tsx` (font imports),
`src/styles/tokens.css` (replace per `01-tokens.css`), `src/styles/global.css`
(`.eyebrow` → mono, heading font/tracking, focus vars), `index.html` (`theme-color`),
`public/favicon.svg`.
**Acceptance:**
- App boots with the three self-hosted families; blocked-font fallback still legible.
- All American `--color-*` references normalised per §4 of `02`;
  `grep -rn "var(--color-[a-z]" src/` returns **zero** (done in Phase 1, not deferred).
- No visual regression crashes; axe serious/critical = 0; `validate` green.
- Focus ring visible on cream, forest, lilac and lime surfaces.

## Phase 2 — Shared components
**Changes:** `Button.tsx` (+ `accent` variant), `Panel.tsx` (+ `tone="feature"`), new
`Tag.tsx`, `components.css` (button/card/panel/badge/field/state/modal surfaces +
`.button-accent`, `.panel-feature`, `.tag-*`, `.photo-frame*`). Fields are styled here
(their `--color-*` drift was already normalised in Phase 1).
**Acceptance:**
- Button renders primary/secondary/quiet/accent with correct hover/focus/pressed/
  disabled/busy; `Button.test.tsx` updated only for the new variant.
- `Panel tone="feature"` renders lilac; `Tag` renders arbitrary string labels with an
  optional visual tone (no fixed category enum).
- Fields, states, dialogs restyled; `TextField`/`ModalSurface`/`StatePatterns` tests
  still pass (behaviour unchanged).
- Photo-frame classes exist and match `07`.

## Phase 3 — Application shell
**Changes:** `styles/navigation.css`, `styles/layout.css`, nav components, brand mark.
**Acceptance:**
- Mobile bottom nav + desktop rail restyled; `aria-current="page"` = lime indicator;
  blob monogram present; mono labels.
- Rail switches at `--breakpoint-desktop`; safe-area padding intact; no horizontal
  scroll at 320/768/1280.
- Navigation Playwright + focus/overlay e2e still pass.

## Phase 4 — Core routes
**Changes:** `HomePage.tsx`, `RecipesPage.tsx`, `PantryPage.tsx`, `PlanPage.tsx`,
`ShoppingPage.tsx` (read each fully first; mostly `[CSS]` + swap to shared variants).
**Acceptance (per route):**
- **Existing** populated, empty, loading and error states match `06` and the reference.
  `[PRODUCT — FUTURE STORY]` items in `06` (e.g. Home tonight-hero, Plan fortnight,
  Shopping retailer copy, Pantry segmented stock) are **excluded** from acceptance.
- Long-name / dense-content and mobile+desktop layouts hold (no overflow/truncation of
  essential text).
- All `data-testid`, accessible names, and integration tests
  (`recipes`/`pantry`/`mealPlanner`/`shopping`) pass unchanged.
- One dominant (`accent` where specified) action per screen.

## Phase 5 — Get Ahead & secondary routes
**Changes:** `GetAheadPage.tsx`, `SettingsPage.tsx`, onboarding, invitation acceptance,
not-found/error boundary, auth screens (visual only).
**Acceptance:**
- Each adopts tokens/type/components; no screen retains terracotta/old serif/bold-sans
  eyebrow.
- `getAhead`/`onboarding`/`householdPeople` tests and auth routing/bootstrap tests pass;
  auth flow unchanged.

## Phase 6 — Cleanup
**Changes:** audit that no `--color-*` references reappeared (they were removed in
Phase 1); remove any temp aliases; replace literal hex duplicates with tokens; delete
dead CSS.
**Acceptance:**
- Zero American `--color-*`; zero temp aliases; `db:lint`/`lint`/`format:check` green;
  no unused token warnings introduced.

## Phase 7 — Verification
**Changes:** none (tests/docs only).
**Acceptance:**
- Axe serious/critical = 0 across representative routes; keyboard-only pass;
  reduced-motion honoured.
- Playwright mobile/tablet/desktop widths pass.
- Reference comparison: each route reviewed against its `references/` screen + PNG at the
  stated viewport; deviations are intentional and noted in the PR.
- Update `docs/engineering/v2/design-system-and-routing.md` with the shipped system
  (promote `04-design-system-and-routing.md`) and record an ADR.

---

## Required final handoff contents (this folder)

| Item | File |
| --- | --- |
| Proposed `tokens.css` | `01-tokens.css` |
| Token migration table + obsolete list + S&R | `02-token-migration.md` |
| Font & delivery spec | `03-fonts.md` |
| Updated design-system doc | `04-design-system-and-routing.md` |
| Component mapping table | `05-component-mapping.md` |
| Route-by-route build notes + states + responsive | `06-route-build-notes.md` |
| Shape/photo-frame + asset manifest + icons | `07-shapes-photos-assets.md` |
| Implementation sequence + acceptance criteria | `08-implementation-plan.md` (this) |
| Visual references (mobile, desktop, wordmark) | `references/*.dc.html` |
| Exported reference PNGs | `references/png/*.png` |

## Obsolete tokens / styles to remove after migration
- All American `--color-*` references (§4 of `02`).
- Any temporary aliases introduced during migration.
- Route-local hex literals that duplicate a token (audit in Phase 4/6).
- Old terracotta-era decorative CSS not reachable after the reskin (audit in Phase 6).
