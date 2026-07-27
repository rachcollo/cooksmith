# ADR 010: Use Orchard Editorial as the Cooksmith design system

- **Status:** Proposed
- **Date:** 2026-07-27

## Context

Cooksmith needed one coherent visual system across its application shell, shared
components, core routes, secondary routes and recovery states. The previous styling
contained inconsistent token names and route-local treatments. CS-82 through CS-89
define and implement the Orchard Editorial migration while preserving product
behaviour.

## Decision

Use Orchard Editorial as Cooksmith's canonical visual system:

- semantic British `--colour-*` tokens with no American aliases;
- self-hosted Cormorant Garamond, Space Grotesk and Space Mono fonts;
- cream, forest, lilac and lime as the approved surface and accent language;
- shared typed components for actions, surfaces, fields, status and overlays;
- Lucide for functional icons; and
- mobile-first layouts verified at small mobile, standard mobile, tablet and desktop
  widths.

The current behaviour in the product and functional specifications remains
authoritative. Future concepts in the Orchard reference folder are not implementation
scope.

## Alternatives

- **Retain the previous mixed styling:** rejected because it leaves inconsistent
  hierarchy, tokens and secondary-route presentation.
- **Copy the reference screens literally:** rejected because some references contain
  future product concepts and would change approved behaviour.
- **Adopt Orchard through the existing token and component boundaries:** selected
  because it provides a coherent visual system without weakening product or
  accessibility contracts.

## Consequences

New interface work must use the shipped semantic tokens and shared primitives. Visual
changes must preserve accessible names, interaction, routing, permissions and
automation identifiers unless separately approved. Reference images support the written
rules but do not override current product behaviour.

## Security impact

No trust boundary, data access, authorisation, secret handling or provider integration
changes. Existing household isolation and RLS requirements remain unchanged.

## Cost impact

A$0/month and A$0/year. Fonts are bundled and self-hosted; no paid design or runtime
provider is introduced.

## Migration impact

Application styling and bundled font assets only. No database migration, Edge Function,
API or hosted configuration change is required. Roll back by reverting the Orchard
implementation PRs; no data repair is needed.

## Product Principles supported

- **Quietly remove work:** consistent hierarchy makes the next action easier to find.
- **Calm and practical:** the system uses a restrained canvas and deliberate emphasis.
- **Trust before convenience:** preserved accessible, permission and recovery contracts
  take precedence over literal mock-up reproduction.

## Rollback or reconsideration trigger

Reconsider if user testing shows the system materially reduces comprehension,
accessibility or task completion. A replacement requires a new ADR and a staged
migration; do not reintroduce compatibility aliases.
