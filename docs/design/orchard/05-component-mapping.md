# Component mapping — Orchard Editorial → Cooksmith React API

Rule: **keep semantic API names** (e.g. `variant="primary"`) rather than colour names
(`variant="lime"`), so the palette can change later without touching call sites. Prefer a
shared component variant over a route-local style. "Change type" below is the smallest
change that delivers the visual.

| Component | File | Current API | Orchard visual | Proposed API | Change type |
| --- | --- | --- | --- | --- | --- |
| Button | `components/ui/Button.tsx` | `variant: primary \| secondary \| quiet`, `busy`, `disabled` | primary = forest pill; secondary = outline forest pill; quiet = ghost; **accent = lime pill** (one per screen) | **Add `accent` to the union**; keep primary/secondary/quiet | **TS + CSS** (union + `.button-accent`) |
| IconButton | `components/ui/IconButton.tsx` | requires `aria-label` | circular, `--touch-target`, Lucide glyph, hover tint | none | CSS-only |
| Panel | `components/ui/Panel.tsx` | `Panel`, `Card` (`.panel`, `.panel.card`) | Panel = flat cream; Card = raised white, `--radius-large`, soft shadow | Add optional `tone?: 'default' \| 'feature'` → `.panel-feature` (lilac) | **TS + CSS** (small) |
| Badge | `components/ui/Badge.tsx` | `tone: neutral \| positive \| attention` | neutral cream chip; positive lime/green; attention amber — **status only**, paired with text/icon | none (keep for status) | CSS-only |
| **Tag** | *new* `components/ui/Tag.tsx` | — | mono pill for free-string recipe `tags` / nullable `category` | `<Tag label={tag} tone="neutral" />` — generic `label: string`, `tone?: 'neutral' \| 'lilac' \| 'lime' \| 'slate'` | **New component** | **TS + CSS** (new) |
| FormField / TextField / TextArea / SelectField | `components/ui/*` | label/hint/error assoc., `error`, `optional` | cream inputs, forest label, `--radius-small`, focus ring + glow, red error | none | CSS-only; `--color-*` drift is already normalised in Phase 1 |
| PageHeader | `components/layout/PageHeader.tsx` | eyebrow/title/description/status/actions | mono eyebrow, Cormorant `h1`, one dominant action | none | CSS/global-only |
| LayoutPrimitives | `components/layout/LayoutPrimitives.tsx` | PageContainer/PageSection/Stack/Inline/ResponsiveGrid | unchanged structure; token-driven spacing | none | none (token-driven) |
| Dialog / Sheet / ModalSurface | `components/ui/*` | native `<dialog>`, focus mgmt | cream surface, `--radius-large`, overlay shadow | none | CSS-only |
| EmptyState / ErrorState / LoadingState / FeedbackState | `components/ui/*` | title/message/action, live regions | mono eyebrow, serif title, one action; spinner restyle | none | CSS-only |
| Navigation (site-header, primary-navigation, navigation-mobile, desktop-rail, brand-mark) | `styles/navigation.css` + nav components | classes + `aria-current` | lime active indicator; lilac **blob monogram**; mono labels | none (classes stable) | CSS-only |
| `.eyebrow` | `styles/global.css` | bold sans caps | **mono** caps, `--letter-spacing-eyebrow`, muted | none | CSS-only |

## Decisions called out (from the handoff feedback)

- **Lime is not a variant of primary.** `primary` stays forest (the everyday dominant
  action). `accent` (lime) is a *separate, rarer* emphasis for the single generative
  commit action per screen. This keeps "one dominant action" honest and avoids two loud
  buttons. If you would rather not expand the union, the fallback is `primary` + a
  documented `className="button-accent"` — but the typed `accent` variant is preferred.
- **Outline = `secondary`, ghost = `quiet`.** No new names; only `accent` is added.
- **Recipe tags are free strings, not a taxonomy.** `category` is `string | null` and
  `tags` is `string[]` (see `00-current-state.md`). The `Tag` component therefore takes a
  generic `label` + optional `tone` — **do not** hard-code `Veggie | Family | Pantry |
  Quick`. Any filtering, automatic categorisation, or colour-per-category assignment is a
  separate **[PRODUCT — FUTURE STORY]**, not part of this migration. `Badge` stays for
  status only.
- **Feature (lilac) panel** is a `tone` on the existing `Panel`, not a new component, so
  promos reuse card structure and spacing.

## New CSS surfaces to author (no logic)

`.button-accent`, `.panel-feature`, `.tag` / `.tag-<tone>`, the photo-frame classes
(`.photo-frame`, `.photo-frame-media`, `.photo-frame-backdrop`), and the list-row accent
bar. All consume tokens; none introduce product behaviour.
