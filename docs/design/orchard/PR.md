# PR brief — Orchard Editorial design system (handoff)

> Claude Design cannot push to GitHub. Apply this locally (or hand to Codex) to open the PR.

## Branch
`agent/orchard-editorial-handoff`

## Title
chore: add Orchard Editorial design-system handoff

(Documentation-only PR — `chore:` satisfies the current PR-governance exemption; a
`docs(design):` title does not.)

## Description (paste into PR body)
Adds the Orchard Editorial design-system handoff under `docs/design/orchard/` — a
repo-native spec for restyling Cooksmith v2. **Docs + references only; no app code or
behaviour changes in this PR.** Implementation lands later as the phased PRs described in
`08-implementation-plan.md`.

Contents:
- Proposed `tokens.css` + token migration (canonical `--colour-*`, drift search-&-replace, obsolete list)
- Self-hosted font delivery spec (weights, fallbacks, OFL licensing)
- Proposed replacement for `docs/engineering/v2/design-system-and-routing.md` (a11y/routing/responsive rules preserved)
- Component API mapping (semantic variants; CSS-only vs TS)
- Per-route build notes with [MARKUP]/[SHARED]/[CSS]/[PRODUCT] change split + preserve-behaviour contract
- Photo-frame/shape spec, Lucide icon usage, asset manifest
- 7-phase implementation plan with acceptance criteria
- Visual references (`.dc.html`) + PNG exports

Note: the proposed `tokens.css` is a **migration target**, not a blind overwrite of
`src/styles/tokens.css` — see `02-token-migration.md`.

## Files added
```
docs/design/orchard/00-current-state.md
docs/design/orchard/README.md
docs/design/orchard/PR.md
docs/design/orchard/01-tokens.css
docs/design/orchard/02-token-migration.md
docs/design/orchard/03-fonts.md
docs/design/orchard/04-design-system-and-routing.md
docs/design/orchard/05-component-mapping.md
docs/design/orchard/06-route-build-notes.md
docs/design/orchard/07-shapes-photos-assets.md
docs/design/orchard/08-implementation-plan.md
docs/design/orchard/references/*.dc.html                 # migration-safe (current functionality)
docs/design/orchard/references/png/*.png                 # 14 per-screen PNGs
docs/design/orchard/references/future-concepts/*.dc.html # aspirational, NOT migration targets
docs/design/orchard/references/support.js
docs/README.md                                           # documentation index link
```

## Apply locally
```bash
# from the cooksmith repo root, after downloading + unzipping the handoff
git checkout -b agent/orchard-editorial-handoff
mkdir -p docs/design/orchard
cp -R /path/to/orchard/* docs/design/orchard/
git add docs/design/orchard
git commit -m "chore: add Orchard Editorial design-system handoff"
git push -u origin agent/orchard-editorial-handoff
# then open the PR against main (gh pr create ...)
```

## Or via Codex
Point Codex at this folder to commit the handoff on the branch above as a **docs-only
PR**. Do **not** start implementation in the same step: the docs PR should merge first,
and Phase 1 begins only after the engineering-package / Jira approval that governs
implementation (see `08-implementation-plan.md`). Codex has repo write access; Claude
Design does not.

## Notes
- The handoff is linked from the repository documentation index (`docs/README.md`).
- `references/` PNGs + `.dc.html` depict **current functionality** (migration targets);
  `references/future-concepts/` holds the aspirational designs and is **not** a target.
- `.dc.html` files need the design runtime to render interactively — `references/png/`
  is the portable view. `support.js` is included so the HTML can be opened in that runtime.
- Keep this PR docs-only; do not mix in `src/` changes so review stays clean.
