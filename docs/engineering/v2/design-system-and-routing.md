# Orchard design system, routing and navigation

## Purpose

Cooksmith uses the Orchard Editorial system: a calm cream canvas, editorial display
type and deliberate lilac and lime accents. Generic components contain presentation
behaviour only. Product rules, data access and future workflow state do not belong in
this layer.

The migration specification in [`docs/design/orchard/`](../../design/orchard/README.md)
records the source design and migration decisions. This document describes the shipped
system.

## Tokens and styling

`src/styles/tokens.css` is the canonical source for semantic colour, typography,
spacing, border, shape, focus, motion, layout and layer tokens. Colour properties use
the British `--colour-*` namespace. American `--color-*` properties and compatibility
aliases are not supported.

Styles remain separated by concern:

- `global.css` supplies reset, typography, shared base rules and reduced-motion
  treatment.
- `layout.css` supplies page, stack, inline, grid and header layouts.
- `components.css` supplies reusable primitives and current route compositions.
- `navigation.css` supplies the adaptive application frame and navigation.
- `mealPlannerLinkedCards.css` supplies the linked planner-card treatment.

Use semantic tokens rather than literal values in components. New tokens need a current
interface use and must not duplicate an existing semantic token.

## Typography, colour and imagery

- Cormorant Garamond is the self-hosted display face.
- Space Grotesk is the self-hosted body and control face.
- Space Mono is the self-hosted label, eyebrow and metadata face.
- Forest carries primary structure; cream carries the canvas; lilac and lime are
  deliberate accents.
- Status always includes text, an accessible name or another non-colour cue.
- Photography uses the shared organic frame. When no image exists, use the neutral
  striped placeholder rather than inventing imagery.
- Functional icons come from the existing Lucide dependency.

Pages use one `h1`, followed by semantic section headings. `PageHeader` holds the title,
concise description, optional context and one dominant action. Long names and dense
content wrap without hiding essential information.

## Current route map

| Path                  | Primary navigation | Current purpose                                              |
| --------------------- | ------------------ | ------------------------------------------------------------ |
| `/`                   | Home               | Current Cooksmith foundation and preview guidance            |
| `/pantry`             | Pantry             | Search, filter and manage household staples and availability |
| `/recipes`            | Recipes            | Search, create, edit and plan saved recipes                  |
| `/plan`               | Plan               | Navigate and manage the current seven-day dinner plan        |
| `/shopping`           | Shopping           | Review, complete and reconcile the generated shopping list   |
| `/get-ahead`          | Get Ahead          | Build and complete a time-bounded preparation session        |
| `/settings`           | Settings           | Manage household members and pending invitations             |
| `/onboarding`         | No                 | Authenticated first-run profile and household setup          |
| `/invitations/accept` | No                 | Authenticated invitation acceptance                          |
| `/welcome`, `/auth/*` | No                 | Authentication and recovery                                  |
| `/health`             | No                 | Environment and shell diagnostic                             |
| `*`                   | No                 | Calm not-found recovery                                      |

Route modules are lazy loaded. The root layout owns loading state, route announcement
and shared navigation. The error boundary provides safe recovery without exposing
provider errors or stack traces. `DocumentTitle` owns the `Page name | Cooksmith`
pattern.

Authenticated users without a complete profile and household pass through onboarding.
Completion is loaded from Supabase and is not inferred from browser storage.

## Navigation

Small screens use six labelled bottom destinations in this order: Home, Pantry,
Recipes, Plan, Shopping and Get Ahead. Settings is desktop-only. Desktop uses the same
six destinations plus Settings, for seven total.

Both navigation treatments use real links, the exact approved Lucide icons, visible
focus, `aria-current="page"` and a navigation landmark. The mobile bar respects safe
areas; the desktop rail begins at the desktop breakpoint.

## Component conventions

Core primitives live in `src/components/ui` and use typed props:

- Buttons provide primary, secondary, quiet and accent variants, semantic tones, and
  disabled and busy states.
- Icon buttons always require an accessible label.
- Fields associate labels, hints and validation messages programmatically.
- Cards, panels, badges, tags and feedback patterns do not use colour as the only cue.
- Photo frames and list rows use shared Orchard surface classes.
- Loading, empty and error states provide a concise status and genuine next action.
- Dialog and Sheet share the native-dialog `ModalSurface` foundation for focus entry,
  containment, Escape, background blocking and focus return.

Keep product decisions out of generic components and preserve established accessible
names and automation identifiers when restyling.

## Accessibility

Target WCAG 2.2 AA:

- semantic landmarks and correct heading order;
- a skip link to main content;
- 44-pixel minimum control targets;
- visible `:focus-visible` treatment;
- programmatically associated field errors;
- live regions for relevant loading and feedback states;
- status communicated independently of colour;
- native overlay keyboard and focus behaviour; and
- non-essential animation reduced through `prefers-reduced-motion`.

Automated tests cover representative navigation, routes, forms, overlays, responsive
overflow and axe serious or critical findings. Automated checks do not replace
keyboard-only, VoiceOver and real-device review before release.

## Responsive expectations

Verify at 320px small mobile, 390px standard mobile, 768px tablet and at least 1280px
desktop. Navigation must not collide with content, actions and metadata must wrap,
overlays must fit the viewport and the document must not scroll horizontally.

Route layouts transform for the available space rather than scaling a phone layout:
the Plan route becomes a seven-column grid on desktop, Recipes and Pantry can use
multi-column content, and Shopping and Get Ahead retain readable centred columns.

## Adding approved interface work

1. Confirm the product behaviour is approved and not a future Orchard concept.
2. Reuse an existing semantic token or typed primitive where it fits.
3. Preserve routes, data loading, permissions, accessible names and identifiers.
4. Add unit/integration evidence and browser coverage for responsive, keyboard and
   accessibility behaviour.
5. Run the repository quality, governance, secret and dependency checks.
6. Record hosted Preview and manual assistive-technology evidence separately.

## Verification commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run docs:commands:check
npm run engineering:check-secrets
npm run security:audit-production
```
