# CS-30 handover: Labelled recipe HTML import

- **Date:** 2026-10-27
- **Branch:** `fix/cs-30-recipe-html-fallback`
- **Target:** `main`
- **Baseline:** `1a4afc5f4473cee88116ba19b166b4c2b44f9fcf`, independently fetched from origin.
- **Status:** Implemented; final CI and hosted verification pending. Draft review only.
- **Engineering package:** `docs/engineering/packages/cs30-url-recipe-import.md`.

## Objective and product impact

Let people import clearly labelled recipe pages that lack Recipe JSON-LD, including the reported Cannings page. Reduce manual copying while preserving trust: require review before saving, retain source attribution, and reject missing or ambiguous sections. The owner approved implementation, push and a draft PR on 27 October; merge and release are separate actions.

## Changes

- Recipe JSON-LD remains first priority, including existing partial-draft warnings, arrays and graphs.
- An inert HTML parser reads Ingredients and Method/Instructions/Directions/Preparation/Steps headings, lists, paragraphs, line breaks, div rows, sibling columns and lower-level grouped subsections. It preserves inline text, decoded entities and source order.
- Both sections and a title are required. Multiple candidates, cross-article sections, nested lists, unlabelled continuation lists, empty groups and excessive depth/size are rejected. Extraction stays within section containers. Known hidden content, scripts, navigation and controls are excluded.
- Explicit author/site metadata is retained; an unambiguous Article/BlogPosting whose headline matches the extracted title can supply attribution. No author, time or serving quantity is guessed. HTML drafts warn that servings and times need review.
- The repository maps known endpoint errors to safe recovery advice. The endpoint distinguishes unsupported media from missing recipe markup and logs the successful parser path.
- URL/DNS/redirect restrictions, fetch timeout/size bounds, authentication, saving and AI configuration remain unchanged.

## Files and dependencies

The import extractor, new `htmlFallback.ts`, handler, recipe repository error adapter, tests, TypeScript test inclusion, npm manifest/lock and function-local Deno dependency configuration are affected. No database migrations.

`htmlparser2@12.0.0` is MIT licensed and parses HTML without a browser or script execution. It is a development dependency for local/CI tests and a function-local npm dependency for Deno; it is not imported into the browser bundle. Both npm and Deno resolutions are locked. Its dependency chain has no findings in the audit taken during this task. Existing production findings in `dompurify` and `zod` also reproduce against the unchanged main lockfile; no unrelated upgrades or audit exceptions were added.

## Verification

- Exact live Cannings HTML fetched with the Cooksmith user agent: 13 ingredients, five steps, Grant Brits attribution and source URL retained. No recipe was saved.
- A synthetic Cannings-layout fixture is committed, alongside varied inline layout fixtures and negative cases. This is fixture coverage, not a claimed percentage of websites supported.
- Focused extraction, safe error mapping, handler and UI recovery tests cover schema priority, malformed earlier JSON-LD, entities, groups, ordering, missing content, multiple recipes, hidden content, inert scripts, unsafe image schemes and SSRF redirect rejection.
- Desktop/mobile Chromium: 50 passed, two existing quantity-loop tests skipped because synthetic PostgREST credentials were not supplied. WebKit was not run.
- Documentation command audit and secret scan passed. Production dependency audit fails on baseline `dompurify` and `zod` findings; unchanged main was checked separately.
- Preflight cannot complete: the pinned Supabase CLI attempts to create `/home/agent/.supabase` on a read-only filesystem. No home override, hosted database connection or production configuration change was made. Database tests are not claimed; no database behaviour changed.
- `npm run validate:static` passed: formatting, lint, strict types, 101 test files / 761 tests and production build. The existing large-chunk advisory remains. Deno 2.2.12 and 2.9.6 type checks passed; the live-page smoke passed under Deno 2.2.12 with the frozen version-4 lockfile and no network permission. Exact pushed commit, PR and CI status are recorded in the final handover.

## Limits and review

This is a conservative English-labelled HTML fallback, not universal recipe extraction. It does not render JavaScript, read image/PDF recipes, bypass access controls, interpret arbitrary prose, or infer omitted quantities. External CSS visibility cannot be evaluated by an inert parser. Unsupported or uncertain layouts should be added manually. Structured Recipe behaviour is retained.

Preview and hosted Edge Function verification remain pending. Review the Cannings URL and synthetic layouts through the import/review UI without saving production recipes; verify failure copy on unrelated/incomplete pages and ensure public/private save controls still require explicit confirmation. No paid AI or production data is needed.

## Release and rollback

No migrations, provider changes or recurring cost (A$0 monthly / annually). After owner review/merge, confirm CI and the Vercel application release. Separately approve the protected **Production Edge Function release** workflow for the exact accepted main SHA so `import-recipe` and its function-local dependency configuration reach the runtime. Do not assume the frontend merge deploys the Edge Function. Keep JWT verification and the two paused AI features unchanged. Verify an authenticated import produces a review draft without saving it, plus a structured Recipe regression. If needed, revert this PR through review and release the previous importer and matching application; no data migration is needed.

No merge, deployment, production writes, AI calls, secrets or real household fixtures were used. No later milestone was started.
