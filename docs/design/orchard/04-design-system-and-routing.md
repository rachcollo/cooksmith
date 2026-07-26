# v2 design system, routing and navigation — Orchard Editorial

> **Status:** Proposed replacement for `docs/engineering/v2/design-system-and-routing.md`.
> This revises the **visual language** to the Orchard Editorial system. All existing
> **accessibility, routing, responsive and component-boundary rules are preserved** and
> restated below. Where Orchard changes behaviour it is called out explicitly; anything
> not called out is unchanged. Engineering rules live in
> `docs/engineering/CODEX_BUILD_RULES.md`.

## Purpose

Cooksmith v2 uses a restrained, mobile-first frame that keeps the next action clear.
Orchard keeps that calm: a cream canvas and an editorial serif carry order; small,
deliberate pops of lilac and lime carry the personality. Generic components contain
presentation behaviour only — product rules, data access and workflow state do not
belong in this layer.

**The one visual principle to protect:** *colour lives in the frame, not the photo.*
Accent colour appears as shapes behind imagery, as tags, and as one dominant action per
screen — never as the only status cue, and never baked into a photograph.

## Tokens and styling

`src/styles/tokens.css` defines semantic tokens for colour, typography, spacing,
borders, radii, decorative shapes, elevation, focus, motion, readable widths,
breakpoints, navigation dimensions, touch targets and layering. Use semantic names
(`--colour-text-muted`, `--space-4`, `--radius-medium`, `--shape-blob`) rather than
literal values.

Canonical colour convention is **British `--colour-*`**. American `--color-*` references
are drift and are being removed (see `02-token-migration.md`). New tokens need a current
interface use — no speculative scales or alternate themes.

Styles are separated by concern and this stays the same:
`global.css` (reset, base typography, `.eyebrow`, focus), `layout.css` (page/stack/grid/
header), `components.css` (UI primitives), `navigation.css` (adaptive frame & nav).

## Typography and layout

- Headings (`h1`–`h3`) use `--font-display` (Cormorant Garamond, weight 500–600,
  `--line-height-tight`). One `h1` per page, then semantic section headings.
- Body, controls and inputs use `--font-body` (Space Grotesk).
- **Eyebrows, meta, tags, numeric labels and nav labels use `--font-mono`
  (Space Mono), uppercase, `--letter-spacing-eyebrow`.** `.eyebrow` in `global.css`
  changes from bold sans to mono; keep it non-decorative (readable size/contrast).
- The wordmark is all-caps Cormorant with `--letter-spacing-caps`, paired with the
  lilac blob monogram. See the wordmark reference.
- Labels and validation text remain readable and are **not** distinguished by size or
  colour alone (unchanged rule).

Compose with `PageContainer`, `PageSection`, `Stack`, `Inline` and `ResponsiveGrid`.
`PageHeader` holds eyebrow, one `h1`, a concise description, optional status, and **one
dominant action**. Secondary actions stay visually subordinate (unchanged rule).

## Route map (unchanged)

| Path | Primary nav | Purpose |
| --- | --- | --- |
| `/` | Home | Foundation / next-action screen today (a tonight's-dinner dashboard is a future story) |
| `/pantry` | Pantry | Pantry staples & stock |
| `/recipes` | Recipes | Recipe library |
| `/plan` | Plan | Seven-day weekly meal plan |
| `/shopping` | Shopping | Shopping list |
| `/get-ahead` | Get Ahead | Prep-ahead session |
| `/settings` | Settings (desktop rail only) | Household members & invitations |
| `/onboarding` | No | First-run profile & household setup |
| `/invitations/accept` | No | Invitation acceptance |
| `/health` | No | Diagnostic |
| `*` | No | Calm not-found recovery |

Routing behaviour is unchanged: lazy-loaded route modules; root layout owns loading
state, route announcement and shared navigation; the route error boundary presents a
safe recovery action without exposing provider errors or stack traces; `DocumentTitle`
owns the `Page name | Cooksmith` pattern; onboarding gating is loaded from Supabase, not
inferred from browser storage. Adding a route follows the same five steps as before.

## Component conventions (Orchard rules)

Core primitives stay in `src/components/ui` with typed props. Prefer a **shared
component variant** over a route-specific style. See `05-component-mapping.md` for the
exact API-per-component and whether each change is CSS-only or needs TypeScript.

### Buttons — variants & hierarchy
Semantic API is retained and preferred over colour names. One dominant action per view.
- `primary` — **forest filled pill**. The default dominant action.
- `secondary` — **outline forest pill** (`--border-outline-action`).
- `quiet` — borderless text/ghost action; for tertiary/inline actions.
- `accent` *(new value)* — **lime filled pill**, reserved for the single most
  important generative/commit action on a screen (e.g. "Generate my week",
  "Start prep session"). Max one per screen; never two accents competing.
All buttons: pill radius, `--touch-target` min height, `busy` (spinner + `aria-busy`)
and `disabled` states. States: default / hover (`--colour-brand-hover`, or `-strong`
accent) / `:focus-visible` (`--focus-ring` + offset) / pressed (slight darken) /
disabled (reduced contrast, no shadow) / busy (spinner, label swap). Destructive actions
use `--colour-error` on a `quiet`/`secondary` surface with an explicit confirm dialog.

### Card vs Panel
- `Panel` (`.panel`) — a plain grouping surface on the cream canvas; minimal chrome.
- `Card` (`.panel.card`) — a **raised** surface (`--colour-surface`, `--border-default`,
  `--radius-large`, `--shadow-soft`); for discrete content objects (recipe, meal, list
  group). Hover lift uses `--shadow-raise` only where the whole card is a link/button.
- **Feature panel** *(new)* — `.panel-feature`, a lilac (`--colour-accent-lilac`) tinted
  panel for a single highlighted promo (e.g. Home "Get ahead"). Use sparingly.
Do not invent route-local card styles; extend these.

### Page header
`eyebrow (mono)` → `h1 (Cormorant)` → `description` → optional `status` → one action
group. Structure and DOM unchanged; only type/colour treatment changes.

### Navigation
Behaviour unchanged; visual only. Source of truth is
`src/app/navigation/navigationItems.ts`. **Mobile: six labelled bottom destinations** —
Home, Pantry, Recipes, Plan, Shopping, Get Ahead (Settings is filtered out of mobile).
**Tablet/desktop (`≥64rem`): one seven-destination rail** — those six plus Settings.
Settings is **desktop-rail-only**, not a mobile header link. Both patterns use real links,
`aria-current="page"`, visible focus, safe-area padding (`--nav-mobile-height`) and a
navigation landmark. **Active/selected indicator is the lime system**
(`--colour-accent-lime-soft` background and/or a lime underline). Icons stay as the
current Lucide set (House, CookingPot, BookOpen, CalendarDays, ShoppingBasket, Sparkles,
Settings). The brand mark becomes the lilac **blob monogram** (`--shape-blob`,
Cormorant "C").

### Photo frame (new pattern)
The "colour behind photo" treatment is a reusable pattern, not a per-page hack — see
`07-shapes-photos-assets.md` for exact construction, aspect ratios, object-fit, offsets,
radius, fallback and `aria-hidden` on the decorative backdrop.

### Icons
Use the existing **Lucide** library. Line icons, default stroke, sized `1.25rem`
(desktop rail / inline) to `1.4rem` (mobile nav / icon buttons), `currentColor`. Do not
hand-draw icons or replace Lucide glyphs with the decorative blob shapes (the blobs are
CSS surfaces, not iconography). `IconButton` always requires an accessible label.

### Form controls
`TextField`, `TextArea`, `SelectField`, `FormLabel/Hint/Error`, `FieldGroup` keep their
API and a11y wiring. Visual: cream input surface, `--colour-border`, forest label,
`--radius-small`; focus uses `--colour-focus` border + `--colour-focus-soft` glow;
error uses `--colour-error` + associated `FormError` (role="alert"). `optional` marker
stays textual. No colour-only validation.

### List rows
Meal/pantry/shopping rows use `Card`/`Panel` surfaces with: an optional **colour accent
bar** (`--shape`/left border in an accent) as a category cue *plus* a text/icon label;
mono meta line; `--touch-target` min height; whole-row hit target where the row is a
link. Long titles wrap (`text-wrap: pretty`) — never truncate an essential name silently.

### Dialogs & sheets
`Dialog` and `Sheet` share `ModalSurface` (native `<dialog>`, focus entry/containment,
Escape, background block, focus return) — **behaviour unchanged**. Visual: cream surface,
`--radius-large`, `--shadow-overlay`, mono eyebrow if used. Destructive confirmations use
a clear title, the destructive action as `secondary`/`quiet` with `--colour-error`, and a
non-destructive default focus.

### Badges, tags, progress & status
- **Status** = `Badge` (`neutral` / `positive` / `attention`) — always paired with text
  or icon, never colour-only. Attention (amber) = "running low"; positive = confirmed/OK.
- **Taxonomy tags** (recipe `tags`) are *content*, not status, and are **free strings**
  (`category: string | null`, `tags: string[]`). Use a generic `Tag` component
  (`label` + optional `tone`), never a hard-coded category enum. Colour-per-category,
  filter chips and auto-categorisation are **[PRODUCT — FUTURE STORY]**.
- **Availability / stock (pantry)** is a **boolean today** (`available`): show an
  in-stock (`positive`) vs unavailable (`neutral`/`attention`) `Badge` or toggle, with a
  text label. Multi-level **segmented stock bars are [PRODUCT — FUTURE STORY]** — do not
  build them for the migration.

### Empty / loading / error / disabled / busy states
Retain the existing components and their next-action rule:
- `EmptyState` — mono eyebrow "NOTHING NEEDED YET", `h2`, message, one genuine action.
- `LoadingState` — spinner + polite live label; `fullPage` variant for boot.
- `ErrorState` — `role="alert"`, eyebrow, `h1`, message, optional reference, one recovery
  action; never expose stack traces.
- `FeedbackState` — success/error/info live region.
- Disabled/busy — reduced contrast / spinner; never remove the accessible name.
Every screen must still answer "what should I do next?" or reassure that nothing's needed.

## Accessibility (unchanged, must be preserved)

Semantic landmarks and correct heading order on every page; skip link to main content;
accessible names on all controls; **44px minimum targets**; visible focus
(`--focus-ring`, `--colour-focus` retained off-palette specifically to stay visible on
warm surfaces); field errors associated with controls; live regions for status. Colour is
never the only cue. Motion is brief and optional; `prefers-reduced-motion` removes
non-essential transition/animation; no state change relies on animation. Keep all
existing `data-testid`/automation identifiers and accessible names.

## Responsive expectations (unchanged)

Usable at small mobile, large mobile, tablet and desktop. Navigation patterns must not
conflict; page actions wrap; overlays fit the viewport; no horizontal scroll. Layout
transforms are defined per pattern in `06-route-build-notes.md` — desktop is a distinct
composition (rail + multi-column), **not** a scaled-up phone. Playwright checks
representative mobile/tablet/desktop widths.

## Testing (unchanged)

`npm run test:unit`, `test:integration`, `test:e2e`, `validate`. Component tests verify
behaviour, not snapshots. Browser tests cover direct navigation, refresh, history,
responsive navigation, focus, overlays, reduced motion and axe serious/critical findings.
A restyle must not break these; update a test only when the accessible behaviour it
asserts genuinely, and intentionally, changes.
