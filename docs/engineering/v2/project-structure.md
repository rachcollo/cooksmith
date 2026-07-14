# v2 project structure and conventions

## Purpose

The v2 application is a greenfield implementation inside the existing repository. It keeps the approved React, TypeScript, Vite and Vercel stack while treating the prototype on `main` as a product-learning reference rather than an architectural foundation.

## Dependency direction

Dependencies flow inwards:

1. Presentation in `routes`, `components` and `app` may call application services.
2. Application services orchestrate domain rules and infrastructure ports.
3. Domain modules contain framework-independent rules and types.
4. Infrastructure implements external concerns such as persistence, providers and logging.

Domain code must not import React, router modules, Supabase clients or browser APIs. UI components must not contain household or product business rules.

## Directories

| Directory                       | Responsibility                                                            |
| ------------------------------- | ------------------------------------------------------------------------- |
| `src/app`                       | Application composition, routes, layouts, providers and error boundaries  |
| `src/application`               | Use-case services and ports introduced with an approved feature milestone |
| `src/components/layout`         | Responsive page and composition primitives with no domain knowledge       |
| `src/components/ui`             | Minimal accessible visual primitives with no domain knowledge             |
| `src/config`                    | Typed, validated runtime configuration                                    |
| `src/domain`                    | Domain modules and deterministic business rules                           |
| `src/infrastructure`            | Logging and future adapters for approved external systems                 |
| `src/routes`                    | Route-level presentation and page composition                             |
| `src/shared`                    | Small utilities that are genuinely shared across modules                  |
| `tests/unit`                    | Isolated logic and component behaviour                                    |
| `tests/integration`             | Application behaviour across real module boundaries                       |
| `tests/e2e`                     | Critical browser journeys against a production-like server                |
| `supabase/migrations`           | Active timestamped Cooksmith v2 migrations only                           |
| `supabase/tests`                | pgTAP tests against the isolated local database                           |
| `supabase/prototype-migrations` | Preserved MVP SQL, excluded from the v2 CLI path                          |

Do not create empty abstractions for possible future features. A later milestone should add a module only when it has a real use case and test.

## Routing

React Router owns client-side routing. The root layout supplies semantic landmarks, navigation, responsive containment and a non-production environment marker. Route errors use the route boundary, unexpected render failures use the application boundary, and unknown locations use the explicit not-found route.

Milestone 4 exposes stable placeholder routes for Home, Pantry, Recipes, Plan, Shopping and Settings. These pages contain no product workflow or data access. `/health` remains a non-primary diagnostic route. See [design, routing and navigation](design-system-and-routing.md) for the route map and extension rules.

## UI baseline

CSS custom properties in `src/styles/tokens.css` define semantic tokens. Layout, component and navigation styles remain split by concern. Primitives are intentionally modest and should grow only in response to product needs.

All interactive work must preserve visible focus, semantic names, 44-pixel minimum touch targets, reduced-motion behaviour and status communication that does not rely on colour alone.

## Errors and logs

Expected input failures should become typed application results when use cases exist. Unexpected rendering failures are caught at the application or route boundary and receive a correlation identifier.

The baseline logger writes structured console records. It removes fields whose names suggest credentials or personal contact data. Callers must still avoid sending household content or secrets. A hosted observability provider needs a separate approved decision and cost review.

## Imports

- Use type-only imports where the value is not needed at runtime.
- Prefer direct module imports over broad index files.
- Keep imports within the dependency direction described above.
- Do not import prototype modules into v2.
