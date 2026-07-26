# Cooksmith — Orchard Editorial handoff

Repo-native handoff for restyling Cooksmith v2 to the **Orchard Editorial** design
system. Built to plug into the existing token/component/route architecture, not to
replace it. Aimed at Codex following `docs/engineering/CODEX_BUILD_RULES.md`.

## What Orchard is (in one line)
A calm cream canvas + editorial serif (Cormorant Garamond) carry order; small, deliberate
pops of **lilac** and **lime** carry the personality. **Colour lives in the frame, not the
photo**, so the pops survive when real food photography drops in.

## Read in this order
0. `00-current-state.md` — **verified current implementation** (read first; everything is
   reconciled against it, and future-only capability is flagged).
1. `01-tokens.css` — proposed `src/styles/tokens.css` (migration target, not blind drop-in).
2. `02-token-migration.md` — canonical naming, existing→new mapping, drift search-&-replace, obsolete list.
3. `03-fonts.md` — self-hosted font delivery, weights, fallbacks, licensing.
4. `04-design-system-and-routing.md` — proposed replacement for the repo's
   `docs/engineering/v2/design-system-and-routing.md`; preserves all a11y/routing/
   responsive/component-boundary rules, replaces the visual language, defines every
   component state.
5. `05-component-mapping.md` — Orchard variants mapped to the real React API
   (semantic names kept; CSS-only vs TS changes marked).
6. `06-route-build-notes.md` — per-route references, states, responsive transforms, and a
   strict **[MARKUP]/[SHARED]/[CSS]/[PRODUCT]** change split.
7. `07-shapes-photos-assets.md` — photo-frame construction, decorative shapes, Lucide
   icon usage, and the asset manifest.
8. `08-implementation-plan.md` — 7 phased PRs with per-phase files + acceptance criteria.

## Visual references
`references/` holds the **migration-safe** design files + PNG exports (current
functionality, correct 6-mobile / 7-desktop nav) — these are the implementation targets:
- `Cooksmith Migration Mobile.dc.html` — 8 mobile screens + the design-system tile.
- `Cooksmith Migration Desktop.dc.html` — desktop app shell, all six core routes
  (Home, Plan, Recipes, Shopping, Pantry, Get Ahead).
- `Cooksmith Wordmark.dc.html` — wordmark, monogram, app icons, colourways.
- `references/png/` — 14 real per-screen PNGs (`mobile-01–08`, `desktop-01–06`), portable.
- `references/future-concepts/` — the aspirational designs (tonight's-dinner dashboard,
  fortnight planner). **Retained for vision, NOT migration targets** — see its README.

The `.dc.html` files are design-tool sources (they need the design runtime to render
interactively); the **PNGs are the portable visual reference**. Treat both as *supporting*
references, not the specification.

## Authority order (when references disagree)
1. **Written rules** in `04`/`06` (authoritative).
2. `.dc.html` reference.
3. PNG reference.

## Non-negotiables
- This is a **visual reskin**. Preserve workflows, data loading, permissions, validation,
  routing, accessible names/roles, keyboard interaction and all `data-testid` /
  automation identifiers. Behaviour changes are `[PRODUCT]` and need separate approval.
- Canonical colour tokens are British `--colour-*`. Remove American `--color-*` drift.
- Self-host fonts; only load the listed weights.
- Colour is never the only status cue; keep 44px targets and visible focus.
- Use the existing **Lucide** icons; do not hand-draw icons or recreate branded assets.

## Reference targets (quick index)

| Route | Mobile ref | Desktop ref | Key viewport |
| --- | --- | --- | --- |
| `/` Home | `mobile-02-home` | `desktop-01-home` | 390w / ≥1024w |
| `/recipes` | `mobile-05-recipes`, `mobile-06-recipe` | `desktop-03-recipes` | 390w / ≥1024w |
| `/plan` *(7-day)* | `mobile-03-plan` | `desktop-02-plan` | 390w / ≥1024w |
| `/shopping` | `mobile-07-shopping` | `desktop-04-shopping` | 390w / ≥1024w |
| `/pantry` | `mobile-08-pantry` | `desktop-05-pantry` | 390w / ≥1024w |
| `/get-ahead` | `mobile-04-get-ahead` | `desktop-06-get-ahead` | 390w / ≥1024w |
| Onboarding | `mobile-01-welcome` | — | 390w |
| Wordmark / brand | `Cooksmith Wordmark.dc.html` | — | — |

Nav (verified): **6 mobile** destinations (Home, Pantry, Recipes, Plan, Shopping, Get
Ahead) + Settings desktop-rail-only = **7 desktop**. PNG files live in `references/png/`.
