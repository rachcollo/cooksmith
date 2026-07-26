# Token migration — Orchard Editorial

`tokens.css` is a **migration**, not a blind overwrite. Replacing values alone will
leave broken styles because the codebase currently references tokens under two
naming conventions and a few tokens that were never defined.

## 1. Canonical naming convention

- **Colour tokens use British spelling: `--colour-*`.** This is already the majority
  convention (`tokens.css`, `global.css`, most of `components.css`, `navigation.css`).
- All American `--color-*` references are **drift** and must be normalised to their
  `--colour-*` equivalent. Several of them point at tokens that do not exist at all
  (e.g. `--color-accent`, `--color-border-subtle`), so they currently resolve to the
  CSS initial/invalid value — i.e. they are already subtly broken.
- No permanent aliases. Do not add `--color-*` fallbacks "to be safe". Fix the refs.

## 2. Existing → Orchard colour mapping

| Existing token | Orchard action | New value / note |
| --- | --- | --- |
| `--colour-text` | Retain, revalue | `#22261f` |
| `--colour-text-muted` | Retain, revalue | `#5b6b52` |
| `--colour-surface` | Retain, revalue | `#fffdf7` |
| `--colour-surface-subtle` | Retain, revalue | `#f5ecde` |
| `--colour-surface-raised` | Retain | `#ffffff` |
| `--colour-brand` | Retain, revalue | `#2e4a34` (forest, was terracotta) |
| `--colour-brand-hover` | Retain, revalue | `#223a29` |
| `--colour-brand-soft` | Retain, revalue | `#e0e7d8` |
| `--colour-positive` / `-soft` | Retain, revalue | `#3f6043` / `#e4eee3` |
| `--colour-attention` / `-soft` | Retain | `#74550f` / `#f7ebd0` |
| `--colour-error` / `-soft` | Retain | `#982f23` / `#f9e3df` |
| `--colour-border` | Retain, revalue | `#e0d6c5` |
| `--colour-border-strong` | Retain, revalue | `#cabfa9` |
| `--colour-focus` | Retain, revalue | `#1f5fd6` (kept off-palette for a11y) |
| `--colour-overlay` | Retain | unchanged |

### New colour tokens introduced
`--colour-text-inverse`, `--colour-surface-sunken`, `--colour-accent-lime` (+ `-strong`,
`-soft`), `--colour-accent-lilac` (+ `-strong`, `-ink`), `--colour-accent-slate`
(+ `-ink`), `--colour-focus-soft`, `--colour-selected`.

## 3. Non-colour token mapping

| Existing token | Orchard action | Note |
| --- | --- | --- |
| `--font-display` | Revalue | `'Cormorant Garamond', Georgia, serif` |
| `--font-body` | Revalue | `'Space Grotesk', …` |
| `--font-mono` | **New** | `'Space Mono', ui-monospace, …` |
| `--font-weight-*`, `--font-display-weight*` | **New** | only weights we load |
| `--font-size-*` | Retain; `-heading-1/2` retuned; `--font-size-eyebrow` **new** | |
| `--letter-spacing-caps / -eyebrow / -display` | **New** | |
| `--line-height-tight` | Revalue `1.02`; `--line-height-snug` **new** | |
| `--space-1…9` | **Unchanged** — do not renumber | |
| `--radius-small/medium/large` | Revalue (10/14/22px) | pill unchanged |
| `--shape-blob / -blob-alt / -arch / -lozenge` | **New** decorative radius presets | |
| `--line-weight-* / --border-strong / --border-outline-action / --border-dashed-slot` | **New** | `--border-default` retained |
| `--shadow-soft` | Revalue (flatter); `--shadow-raise` **new** | overlay retained |
| `--focus-ring / -width / -offset` | **New** (wraps `--colour-focus`) | |
| `--motion-fast/standard/ease` | Retain; `--motion-slow` **new** | |
| `--layout-content/reading/rail` | Retain (`rail` → `15rem`) | |
| `--breakpoint-tablet / -desktop` | **New** (mirror media queries) | |
| `--nav-rail-width / -mobile-height / -item-min` | **New** | |
| `--touch-target`, `--z-*` | **Unchanged** | |

## 4. Search-and-replace migration list (drift normalisation)

Apply these literal replacements across `src/`. Scope confirmed to
`src/styles/components.css` and `src/styles/navigation.css` (20 references total).

```
var(--color-surface)         → var(--colour-surface)
var(--color-surface-subtle)  → var(--colour-surface-subtle)
var(--color-text)            → var(--colour-text)
var(--color-text-muted)      → var(--colour-text-muted)
var(--color-border)          → var(--colour-border)
var(--color-border-subtle)   → var(--colour-border)
var(--color-accent)          → var(--colour-focus)
var(--color-accent-soft)     → var(--colour-focus-soft)
```

Notes:
- `--color-border-subtle` had no canonical definition → folds into `--colour-border`.
- `--color-accent` / `--color-accent-soft` were used only for **field focus** styling
  (input focus border + glow). They map to the accessible focus tokens, not to a
  decorative accent, so keyboard focus stays consistent app-wide.

**Do this in Phase 1, not later.** All American references are normalised in Phase 1 (with
the token swap); Phase 6 only *audits* that none reappeared and removes dead styles — it
does not defer the normalisation. After Phase 1, grep must return **zero** hits:
```
grep -rn "var(--color-[a-z]" src/    # must be empty from Phase 1 onward
```

## 5. Obsolete / to-remove after migration

- All American `--color-*` references (removed by §4).
- No obsolete token *names* in `tokens.css` itself — every current name is retained or
  revalued. Do not delete `--colour-brand-soft` etc.; they remain in use.
- If any route CSS hard-codes literal hex values that now duplicate a token
  (audit during Phase 4/6), replace the literal with the token.

## 6. What tokens alone will NOT fix (structural CSS follow-ups)

Revaluing tokens restyles most of the app, but these need structural CSS work
(tracked in the phase plan, none require product-logic changes):

- `.eyebrow` (in `global.css`) changes from bold sans to **mono** — see 03/04.
- `.brand-mark` (navigation.css) becomes the lilac **blob monogram** (radius + font).
- Active nav indicator moves to the **lime** system (`--colour-accent-lime-soft`).
- New **outline / accent** button surfaces (`.button-secondary`, `.button-accent`).
- The **photo-frame** pattern (colour-behind-photo) is new CSS — see 07.
- Feature panel tint (`.panel-feature`, lilac) is new CSS.
