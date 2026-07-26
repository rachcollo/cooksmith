# Shapes, photo frames & asset manifest — Orchard Editorial

## The photo-frame pattern (colour behind the photo)

The signature treatment. **Colour lives in the frame, not the photo** — a coloured
organic shape sits *behind* an offset, neutrally-masked image, so the accent pop survives
when real photography drops in.

### Structure
```html
<figure class="photo-frame">
  <span class="photo-frame-backdrop" aria-hidden="true"></span>
  <img class="photo-frame-media" src="…" alt="Roast chicken with charred lemon" />
</figure>
```
```css
.photo-frame { position: relative; aspect-ratio: 1 / 1; } /* see ratios below */
.photo-frame-backdrop {
  position: absolute; inset: -6% -8% 4% 4%;      /* offset so colour peeks out */
  background: var(--colour-accent-lime);          /* or -lilac; alternate per surface */
  border-radius: var(--shape-blob);
}
.photo-frame-media {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; object-position: center;
  border-radius: var(--shape-blob);
}
```

### Rules
- **Aspect ratios:** hero (Home/recipe) `1/1`; recipe-card thumb `4/3`; meal thumbnail
  `1/1`; onboarding `1/1`. Keep the ratio; never distort — `object-fit: cover`.
- **Crop:** `object-position: center` default; food heroes may use `center 40%` to favour
  the plate. Set per-image only when needed.
- **Backdrop offset:** asymmetric (`inset: -6% -8% 4% 4%`) so a crescent of colour shows.
  Alternate `--colour-accent-lime` / `--colour-accent-lilac` across a screen for rhythm.
- **Shape:** default `--shape-blob`; `--shape-arch` (recipe hero alt) and `--shape-lozenge`
  are permitted; pick one per surface and stay consistent within a screen.
- **Radius on the image and backdrop must match** the chosen shape token.
- **Decoration is hidden from AT:** backdrop is `aria-hidden`; the `<img>` carries a real
  `alt` (or `alt=""` if purely decorative).
- **Responsive:** frame scales with its container; offsets are `%`-based so they hold at
  every width. On very small widths reduce backdrop offset to avoid clipping the card.

### Fallback when no image exists
Render a **neutral striped placeholder** inside the frame (not a coloured one — colour
stays in the backdrop) with a mono caption of what belongs there:
```css
.photo-frame-media.is-empty {
  background: repeating-linear-gradient(135deg,
    var(--colour-placeholder-stripe-a) 0 10px,
    var(--colour-placeholder-stripe-b) 10px 20px);
  display: grid; place-items: center;
  font: var(--font-weight-bold) 0.5rem/1 var(--font-mono);
  letter-spacing: var(--letter-spacing-caps); color: var(--colour-placeholder-ink);
}
```
The backdrop shape still shows, so an imageless state still reads as Orchard, not broken.

## Brand mark — canonical treatments (one per surface, no inference)

| Surface | Treatment | Spec |
| --- | --- | --- |
| **Navigation mark** (`.brand-mark`, rail + welcome) | Lilac **blob monogram** | `--colour-accent-lilac` background, `--shape-blob` radius, Cormorant "C" `--font-display-weight` in `--colour-brand`; `aria-hidden` when the visible "COOKSMITH" wordmark text sits beside it. |
| **Favicon** (`public/favicon.svg`, 16–32px) | Forest square, cream "C" | `--colour-brand` rounded square (`--radius-small`), Cormorant "C" in `--colour-text-inverse`. **No lime dot, no blob** — too fine at 16px. |
| **Maskable app icon** (512×512 PNG) | Forest, cream "C" + lime dot | `--colour-brand` field with maskable safe-area padding, Cormorant "C" in `--colour-text-inverse`, one `--colour-accent-lime` dot bottom-right. |

The wordmark sheet shows exploratory options; **these three are the approved marks** —
do not infer a mark from the other sheet variants.

## Decorative shapes (non-photo)

- **Blob monogram** — see the navigation mark above.
- **Accent bars** — a `--line-weight-heavy`+ rounded strip in an accent colour as a
  category cue on list rows/cards (always with a text label too).
- **Blob/lozenge chips** — time/serves tags may sit as small pills over a frame corner.
- Shapes are **CSS surfaces, not icons** — never used to convey meaning alone, never
  replace a Lucide glyph.

## Icons

Use the existing **Lucide** dependency for all functional icons. Line style,
`currentColor`, size `1.25rem` (rail/inline) to `1.4rem` (mobile nav / `IconButton`).
**Navigation icons are already chosen — use these exactly** (source
`src/app/navigation/navigationItems.ts`); any alternative is a separate design decision:
Home `House`, Pantry `CookingPot`, Recipes `BookOpen`, Plan `CalendarDays`,
Shopping `ShoppingBasket`, Get Ahead `Sparkles`, Settings `Settings`.
Other in-UI icons already in use: close `X` (`ModalSurface`), filters `ListFilter`,
add `Plus`, insight `Sparkles` (`PantryPage`). Do not add a second icon library or
hand-draw SVG icons.

## Asset manifest

| Asset | Destination | Format / size | Behaviour | Source / licence |
| --- | --- | --- | --- | --- |
| Cormorant Garamond (500, 600, 500i) | Fontsource npm package | woff2, latin subset | `font-display: swap` | Google Fonts, **OFL 1.1** |
| Space Grotesk (400,500,600,700) | Fontsource npm package | woff2, latin | swap | **OFL 1.1** |
| Space Mono (400,700) | Fontsource npm package | woff2, latin | swap | **OFL 1.1** |
| Favicon | `public/favicon.svg` (update existing) | SVG | forest rounded square + cream "C" (no blob/dot at 16px) | product-owned |
| App icon (maskable) | `public/` | 512×512 PNG | forest field + cream "C" + one lime dot, maskable safe-area | generated from the canonical mark spec above |
| Food photography — Home hero | provided at build | ≥1200×1200, `1/1` crop | `object-fit: cover`, blob frame; **striped placeholder fallback** | **PRODUCT-PROVIDED — not included; do not invent** |
| Food photography — recipe cards | provided | ≥800×600, `4/3` | cover; placeholder fallback | product-provided |
| Food photography — recipe hero | provided | ≥1200×1200, `1/1` | cover; placeholder fallback | product-provided |
| Meal thumbnails (plan) | provided | ≥400×400, `1/1` | cover; placeholder fallback | product-provided |

### Notes on assets
- **No branded/third-party imagery is included or should be recreated from screenshots.**
  All food photos are supplied by the product team; until then the striped placeholder is
  the correct, shippable state.
- The wordmark and monogram are **type + CSS** — there is no logo raster to license; the
  only brand raster is the favicon/app icon, generated from the wordmark sheet.
- Lucide covers icons; no icon assets to add.
