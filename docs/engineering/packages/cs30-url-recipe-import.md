# Engineering Package — CS-30: Import and Review a Recipe from a URL

**Status:** Ready for Build after CS-27 and CS-28  
**Branch:** `cs30-url-recipe-import`  
**Base branch:** Latest `main`  
**Release requirement:** First release  
**Can run concurrently with:** CS-20 after shared dependencies merge  
**Depends on:** CS-27 and CS-28

---

## 1. Objective

Let a household member paste a public recipe URL, import the useful recipe information, review and correct it in Cooksmith’s simple multiline authoring experience, and explicitly save it to their household library.

Import is an assistive draft workflow, not an invisible or automatic save.

## 2. User Outcome

A user can:

- paste a public `http` or `https` recipe URL;
- request an import and see clear progress;
- review the extracted title, ingredients, instructions, source, and supported metadata;
- edit ingredients and instructions in the CS-27 multiline fields;
- save only after confirming the result;
- recover easily when a page is unsupported, incomplete, or unavailable.

## 3. Import Flow

1. User opens Import recipe and submits a URL.
2. The server validates and safely fetches the URL.
3. Extraction prefers structured recipe metadata.
4. A draft is returned; nothing is persisted as a household recipe yet.
5. The user reviews and edits the draft using normal recipe authoring.
6. Save uses the CS-28 derivation and atomic recipe repository.
7. The saved recipe retains canonical source attribution.

Repeated submission or save must not create accidental duplicates.

## 4. Extraction Requirements

Use a layered, deterministic approach:

- Prefer valid Schema.org `Recipe` JSON-LD, including graph and array forms.
- Map title, description/notes where appropriate, ingredient lines, instruction text/sections, yield/servings, times, image URL, author/site attribution, and canonical source URL when available.
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
- Keep source URL visible and editable only through deliberate action.
- Warn before discarding an imported draft.
- Preserve focus, labels, error associations, keyboard access, and mobile usability.
- Do not use dark patterns or preselect consent for unrelated data use.

## 7. Persistence, Attribution, and Duplicate Handling

- Save only after explicit confirmation.
- Store the normalized/canonical source URL and available site/author attribution.
- Use the normal household-scoped transactional recipe save.
- Apply CS-28 derivation to reviewed text.
- Before save, warn when the active household already has a recipe with the same normalized source URL; allow the user to open it or deliberately continue.
- Do not make remote page content the ongoing source of truth after save.
- Do not automatically refresh or overwrite a saved recipe from the web.

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
- explicit save is atomic and household scoped;
- partial extraction and manual fallback;
- repeated submission/save does not duplicate unintentionally.

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
- saving uses CS-28 and preserves source attribution;
- unsupported pages have a clear manual fallback;
- SSRF, redirect, timeout, size, content-type, rate-limit, and privacy controls are verified;
- duplicate submissions and source URLs are handled safely;
- automated checks, CI, and hosted-preview smoke tests pass;
- completion and operational handover documentation are committed.

## 12. Deliverables

- import entry and review UI;
- secure server fetch endpoint/service;
- structured-data extractor and fixtures;
- mapping to the CS-27/CS-28 contract;
- duplicate-source warning and source attribution;
- security, unit, integration, and household-isolation tests;
- observability, runbook, completion report, and handover.

## 13. Concurrency Boundaries

Begin only after CS-27 and CS-28 merge. It may run alongside CS-20 because both consume the stable recipe contract. Do not modify Meal Planner, Pantry, shopping lists, public sharing, or Cook With Me in this package.
