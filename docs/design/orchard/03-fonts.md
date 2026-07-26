# Font delivery — Orchard Editorial

The mock-ups load fonts from Google Fonts for convenience. **Production must
self-host** — it matches Cooksmith's `noindex`, privacy-conscious, performance-first
posture and removes a third-party runtime request on the critical path. Do not ship a
runtime dependency on `fonts.googleapis.com`.

## Families, weights & styles (load ONLY these)

| Role | Family | Weights / styles | Token |
| --- | --- | --- | --- |
| Display / headings | **Cormorant Garamond** | 500, 600, 500 italic | `--font-display` |
| Body / UI | **Space Grotesk** | 400, 500, 600, 700 | `--font-body` |
| Labels / eyebrows / meta / tags | **Space Mono** | 400, 700 | `--font-mono` |

Do not introduce type styles that need weights outside this set (e.g. no Cormorant 700,
no Space Grotesk 300). If a design appears to need one, change the design, not the load.

## Delivery mechanism (canonical)

Use **Fontsource** self-hosted packages — the single canonical delivery mechanism (npm,
no external CDN at runtime, tree-shakeable, woff2). Cooksmith requires **exact-versioned**
dependencies, so install with `--save-exact` and commit the regenerated
`package-lock.json` in the same PR (Phase 1).

```
# verified latest on the npm registry at handoff (2026-07-26) — pin exactly:
npm i --save-exact \
  @fontsource/cormorant-garamond@5.3.0 \
  @fontsource/space-grotesk@5.3.0 \
  @fontsource/space-mono@5.3.0
```

Record these exact versions in `package.json` (no `^`/`~`) and include the lockfile delta
in the Phase 1 PR. These are intentionally-selected, verified versions; if a newer patch
exists at implementation time, pin that exact patch and note it — never install unpinned.

**Cost & footprint (state in the PR):**
- Monthly cost: **A$0**
- Annual cost: **A$0**
- Runtime external font requests: **none** (fully self-hosted woff2)

Import only the weights used, once, at the app entry (`src/main.tsx`, above
`./styles/global.css`):

```ts
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/space-mono/400.css'
import '@fontsource/space-mono/700.css'
import './styles/global.css'
```

Fontsource sets `font-display: swap` by default. **Documented fallback only** (do not use
unless a decision is made to drop Fontsource): hand-author `@font-face` in a new
`src/styles/fonts.css` imported **first** inside `global.css` (before `tokens.css`), keep
`font-display: swap`, and store woff2 files in `src/assets/fonts/`. Never place
`@font-face` in `tokens.css`. Pick **one** mechanism — Fontsource is canonical.

## Fallback stacks (already in tokens)

```
--font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
--font-body:    'Space Grotesk', ui-sans-serif, system-ui, -apple-system,
                BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:    'Space Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

## Behaviour if fonts fail / are still loading

- `font-display: swap` → text renders immediately in the fallback, swaps in when ready;
  no invisible-text (FOIT) period.
- Georgia (display) and system-ui (body) are metrically close enough that layout shift
  is minor. Verify hero headings do not reflow more than one line at desktop width.
- The design must remain legible and correctly laid out in the fallback stack alone
  (test by blocking font loads). Nothing depends on a glyph unique to these families.

## Performance

- Self-hosted woff2 only; subset to `latin` (Fontsource `latin` variants) — the product
  is en-AU.
- Preload is optional; if hero text LCP regresses, add `<link rel="preload">` for the
  Space Grotesk 500 and Cormorant 600 woff2 in `index.html`.
- Update `index.html` `theme-color` from `#f4f0e7` to the cream `#f5ecde`.

## Licensing

All three are **SIL Open Font License 1.1** — free for commercial/self-hosting/embedding.
Keep each family's `OFL.txt` alongside the woff2 files (Fontsource includes licence
metadata in the package). No attribution required in-product.
