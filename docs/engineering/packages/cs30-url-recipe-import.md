# Engineering Package — CS-30: Import and Review a Recipe from a URL

**Status:** Ready for Build after CS-27 and CS-28  
**Branch:** `cs30-url-recipe-import`  
**Base branch:** Latest `main`  
**Release requirement:** First release  
**Can run concurrently with:** CS-20 after shared dependencies merge  
**Depends on:** CS-27 and CS-28

---

## 1. Objective

Let a user paste a public recipe URL, import the useful recipe information, review and correct it in Cooksmith’s simple multiline authoring experience, and explicitly save it either to Cooksmith’s shared recipe bank or to their private collection.

Imports are public by default so useful attributed recipes build a platform-wide recipe bank. The user can deliberately choose **Private** before saving; a private import is visible only to the importing user. Import is an assistive draft workflow, not an invisible or automatic save.

## 2. User Outcome

A user can:

- paste a public `http` or `https` recipe URL;
- request an import and see clear progress;
- review the extracted title, author name, ingredients, instructions, source, and supported metadata;
- edit ingredients and instructions in the CS-27 multiline fields;
- see that **Public** is the default visibility and deliberately switch to **Private** when required;
- save a public import to the shared Cooksmith recipe bank or a private import to their user-only collection;
- save only after confirming the result;
- recover easily when a page is unsupported, incomplete, or unavailable.

## 3. Import Flow

1. User opens Import recipe and submits a URL.
2. The server validates and safely fetches the URL.
3. Extraction prefers structured recipe metadata.
4. A draft is returned; nothing is persisted yet.
5. The user reviews and edits the draft using normal recipe authoring, including the extracted author name.
6. The review clearly shows visibility. **Public** is selected by default; the user may choose **Private** before saving.
7. Save uses the CS-28 derivation and the appropriate atomic public-bank or private-recipe repository path.
8. The saved recipe retains canonical source attribution and author name.

Repeated submission or save must not create accidental duplicates.

## 4. Extraction Requirements

Use a layered, deterministic approach:

- Prefer valid Schema.org `Recipe` JSON-LD, including graph and array forms.
- Map title, description/notes where appropriate, ingredient lines, instruction text/sections, yield/servings, times, image URL, **author name**, site attribution, and canonical source URL when available.
- Store the extracted author name as a dedicated nullable field, separate from site/publisher and source URL, so it can support later filtering and recommendations.
- Preserve the supplied author string faithfully after safe trimming; do not infer a person when the source provides only a publisher or website name.
- Support `HowToStep`, `HowToSection`, strings, and nested instruction arrays.
- Convert extracted ingredients and instructions into lossless multiline draft text.
- Preserve order and do not invent missing data.
- Use a narrowly scoped safe fallback only if maintainable and tested.
- Never bypass paywalls, authentication, robots/access controls, or anti-bot measures.
- Do not promise that every website can be imported.

Imported remote images must not be copied or proxied unless a separate approved storage/security design exists. A remote image URL may be previewed only under the app’s established safe image policy.

## 5. Server-Side Fetch Security

Fetching arbitrary user URLs is an SSRF boundary and must be implemented server-side with:

- allow only `http` and `https`;
- reject credentials in URLs and nonstandard schemes;
- resolve and reject loopback, link-local, private, reserved, multicast, metadata-service, and internal addresses for IPv4 and IPv6;
- revalidate every redirect target and enforce a small redirect limit;
- defend against DNS rebinding by validating resolved connection targets;
- set strict connection/read timeouts and response-size limits;
- accept only expected textual content types;
- send a clear Cooksmith user agent and follow lawful site access rules;
- do not forward user cookies, auth headers, or internal headers;
- bound decompression and parsing work;
- return generic user errors without leaking network internals.

Use the project’s server runtime and secrets model. Never fetch arbitrary recipe pages directly from the browser.

## 6. Review UX and Accessibility

- Keep URL entry to one clear field and action.
- Show progress, cancellation/retry where practical, and friendly failure states.
- Present imported data as an editable draft, clearly marked as not yet saved.
- Use the same multiline fields as manual authoring.
- Highlight missing or uncertain sections without blocking correction.
- Keep source URL and author attribution visible and editable only through deliberate action.
- Present a clear Public/Private visibility control with concise consequences: Public adds the recipe to Cooksmith’s shared recipe bank; Private limits it to the importing user.
- Default URL imports to Public as an intentional product default, while keeping Private equally reachable before save.
- Warn before discarding an imported draft.
- Preserve focus, labels, error associations, keyboard access, and mobile usability.
- Do not bundle unrelated consent or obscure the visibility choice.

## 7. Visibility, Persistence, Attribution, and Duplicate Handling

- Save only after explicit confirmation.
- Store visibility as an enforced enum/contract such as `public` or `private`; do not infer visibility from a nullable household ID.
- Store the importing user ID for ownership/audit and the normalized canonical source URL, author name, and available site/publisher attribution.
- Public recipes are platform-level canonical records readable across Cooksmith. They must not be implemented by weakening household RLS on existing household recipes.
- Private imports are owned by and readable only to the importing user, including from within a shared household.
- Importing or adding a public recipe to a user’s collection creates a collection/reference relationship or user-owned snapshot; a user must never directly mutate the shared canonical recipe for everyone.
- User edits to a collected public recipe must either remain user-specific or follow a deliberate contribution/moderation workflow outside this package.
- Apply CS-28 derivation to reviewed text on both visibility paths.
- Detect public duplicates primarily by normalized canonical source URL, with secondary signals for attribution/title; reuse or link to an existing public canonical recipe rather than silently publishing another copy.
- Detect duplicate private imports for the importing user and require deliberate confirmation before continuing.
- Public-to-private and private-to-public changes require explicit user action and authorization; publication must never expose an existing private recipe accidentally.
- Do not make remote page content the ongoing source of truth after save.
- Do not automatically refresh or overwrite a saved recipe from the web.
- Record provenance sufficient for moderation, correction and takedown. Include a minimal unpublish/takedown path for public records without deleting users’ private data.

## 8. Failure and Observability

Handle invalid URL, blocked network target, timeout, oversized response, unsupported content, parse failure, partial extraction, and save failure distinctly enough for the user to recover.

- Partial extraction should open a reviewable draft when useful.
- Provide a manual paste/edit fallback.
- Log outcome category, duration, parser path, and source hostname.
- Do not log full imported recipe bodies, query secrets, credentials, or household-private content.
- Add rate limiting/abuse controls appropriate to the public endpoint.
- No paid extraction provider or LLM dependency without explicit product and cost approval.

## 9. Testing Requirements

### Unit

- URL normalization and rejection;
- JSON-LD graph/array and instruction variants;
- ingredient/instruction ordering and multiline conversion;
- missing, malformed, and ambiguous metadata;
- duplicate-source detection;
- error mapping.

### Security and Integration

- private/loopback/link-local/metadata targets rejected for IPv4 and IPv6;
- redirect target revalidation and redirect limits;
- DNS rebinding-safe connection behaviour;
- timeout, size, content-type, and decompression limits;
- no client-side arbitrary fetch;
- draft review does not save prematurely;
- Public is the visible default and Private can be selected before save;
- public save is atomic, creates/reuses a canonical bank record and is readable across authenticated platform users;
- private save is atomic and readable only by the importing user, including against other members of the same household;
- author name persists separately from publisher/site and source URL;
- collecting or editing a public recipe cannot mutate the canonical record for other users;
- public/private RLS and API authorization matrices cover owner, same-household non-owner, unrelated authenticated user and anonymous access;
- partial extraction and manual fallback;
- repeated submission/save does not duplicate unintentionally;
- publication changes and takedown/unpublish behaviour do not expose or destroy private recipes.

Use checked-in fixtures or controlled test servers. Do not depend on live third-party recipe sites in CI.

## 10. Validation and Hosted Preview

Run repository-standard application, database, generated-type, security, test, build, and CI checks.

On the hosted preview, test representative public recipes from more than one site only where lawful and stable, plus invalid, partial, duplicate, slow/failing, mobile, and keyboard flows. Never use production secrets or private URLs.

## 11. Acceptance Criteria

CS-30 is complete when:

- a public recipe URL can produce a reviewable Cooksmith draft;
- structured JSON-LD recipes import reliably across supported shapes;
- ingredients and instructions land in the multiline authoring fields in order;
- the user can correct everything before an explicit save;
- saving uses CS-28 and preserves source URL, site attribution and a dedicated author-name field;
- Public is the clear default and saves to/reuses the shared Cooksmith recipe bank;
- Private can be selected before save and is visible only to the importing user;
- public canonical recipes cannot be directly overwritten through a user’s collection edits;
- unsupported pages have a clear manual fallback;
- SSRF, redirect, timeout, size, content-type, rate-limit, visibility, RLS and privacy controls are verified;
- duplicate submissions and source URLs are handled safely across public and private visibility paths;
- automated checks, CI, and hosted-preview smoke tests pass;
- completion and operational handover documentation are committed.

## 12. Deliverables

- import entry and review UI;
- secure server fetch endpoint/service;
- structured-data extractor and fixtures;
- mapping to the CS-27/CS-28 contract;
- visibility control, public-bank persistence, private user ownership and duplicate-source handling;
- dedicated author-name extraction, persistence and attribution display;
- security, unit, integration, public/private authorization and household-isolation tests;
- minimal public-recipe moderation/unpublish and provenance support;
- observability, runbook, completion report, and handover.

## 13. Concurrency Boundaries

Begin only after CS-27 and CS-28 merge. It may run alongside CS-20 because both consume the stable recipe contract. Do not modify Meal Planner, Pantry, shopping lists, general-purpose social sharing, or Cook With Me in this package. The shared recipe bank and import visibility rules described here are part of CS-30.
