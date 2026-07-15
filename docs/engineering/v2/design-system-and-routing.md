# v2 design system, routing and navigation

## Purpose

Cooksmith v2 uses a restrained, mobile-first frame that keeps the next action clear. Generic components contain presentation behaviour only. Product rules, data access and future workflow state do not belong in this layer.

## Tokens and styling

`src/styles/tokens.css` defines semantic tokens for colour, typography, spacing, borders, radii, elevation, focus, motion, readable widths, breakpoints, touch targets and layering. Use semantic names such as `--colour-text-muted` or `--space-4`, rather than copying literal values into components.

Styles are separated by concern:

- `global.css` supplies the reset, typography and shared base rules.
- `layout.css` supplies page, stack, inline, grid and header layouts.
- `components.css` supplies the reusable UI primitives.
- `navigation.css` supplies the adaptive application frame and navigation.

New tokens need a current interface use. Do not add speculative scales or alternate themes.

## Typography and layout

Pages use one `h1`, followed by semantic section headings. The responsive type scale keeps titles legible without overwhelming small screens. Labels and validation text remain readable and are not distinguished by size or colour alone.

Use `PageContainer`, `PageSection`, `Stack`, `Inline` and `ResponsiveGrid` for common composition. `PageHeader` holds the title, concise description, optional context and one dominant action. Secondary actions must remain visually subordinate.

## Route map

| Path          | Primary navigation | Current purpose                                     |
| ------------- | ------------------ | --------------------------------------------------- |
| `/`           | Home               | Introduce the foundation and direct the next action |
| `/pantry`     | Pantry             | Placeholder for the approved pantry milestone       |
| `/recipes`    | Recipes            | Placeholder for the approved recipe milestone       |
| `/plan`       | Plan               | Placeholder for the approved planning milestone     |
| `/shopping`   | Shopping           | Placeholder for the approved shopping milestone     |
| `/settings`   | Settings           | Placeholder for future approved settings work       |
| `/onboarding` | No                 | Authenticated first-run profile and household setup |
| `/health`     | No                 | Non-primary environment and shell diagnostic        |
| `*`           | No                 | Calm not-found recovery                             |

Route modules are lazy loaded. The root layout provides the loading state, route announcement and shared navigation. The route error boundary presents a safe recovery action without exposing provider errors or stack traces. `DocumentTitle` owns the consistent `Page name | Cooksmith` title pattern.

Authenticated users without a completed profile and household are routed through `/onboarding` before the application frame is shown. Completion state is loaded from Supabase and is not inferred from browser storage. Returning users with a completed onboarding record bypass this route.

To add a future approved route:

1. Create a route-level component in `src/routes`.
2. Add it to `createAppRouter.tsx` with lazy loading.
3. Add navigation only when the approved information architecture requires it.
4. Set a meaningful document title and use the shared page pattern.
5. Add direct-route, navigation, title, error and browser smoke coverage.

## Navigation

Small screens use five labelled bottom destinations: Home, Pantry, Recipes, Plan and Shopping. Settings remains a clearly labelled header link so the mobile bar stays focused. Tablet and desktop widths use one six-destination navigation rail. Both patterns use real links, current-page semantics, visible focus and a navigation landmark. Mobile spacing respects device safe areas.

## Component conventions

Core primitives live in `src/components/ui` and use typed props:

- Buttons provide primary, secondary and quiet emphasis plus disabled and busy states.
- Icon buttons always require an accessible label.
- Fields programmatically associate labels, hints and validation messages.
- Cards, panels, badges and feedback patterns never use colour as the only status cue.
- Loading, empty and error states provide concise status and a genuine next action.
- Dialog and Sheet share one native dialog foundation for focus entry, focus containment, Escape handling, background blocking and focus return.

Do not put product decisions in generic components. Prefer direct component imports over broad index files.

## Accessibility

Every page uses semantic landmarks and a correct heading order. A skip link targets the main content. Controls provide accessible names, 44-pixel minimum targets and visible focus. Field errors are associated with their controls. Status messages use live regions where appropriate.

Motion is brief and optional. The `prefers-reduced-motion` query removes non-essential transitions and animation. No state change relies on animation.

Automated tests cover representative routes, navigation, form associations, overlays and axe serious or critical findings. Automation does not replace VoiceOver, keyboard-only and real-device review before a friend-test release.

## Responsive expectations

The frame must remain usable at small mobile, larger mobile, tablet and desktop widths. Navigation must not conflict, page actions must wrap, overlays must fit the viewport and content must not create horizontal scrolling. Playwright checks representative mobile, tablet and desktop widths without a paid visual-regression service.

## Testing

Use:

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run validate
```

Component tests verify behaviour rather than snapshots. Browser tests cover direct navigation, refresh, back and forward history, responsive navigation, focus, overlays, reduced motion and automated accessibility.
