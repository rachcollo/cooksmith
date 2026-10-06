# CS-80 — Household favourite recipes

## Outcome and scope

Household members can save and remove favourites from Recipe Library cards and details, then combine the Favourites filter with recipe search. Changes appear immediately, duplicate clicks are suppressed and a failed request restores the prior choice with an accessible retry message. A recipe detail dialog includes its own live status region.

This branch starts from accepted main `b2fb576ebce250e325df297670d62df18c523339` and is independent of CS-96 / PR189. It contains no automatic planner ranking change: the optional favourites preference is deferred, retaining existing dietary, lock and variety behaviour. Private imported recipes are personal, not household/shared recipes, so they have no household favourite control.

## Implementation and isolation

- `household_recipe_favourites` stores household ownership and exactly one household/imported recipe reference. Foreign keys cascade on deletion; unique indexes prevent duplicate source references.
- The security-invoker RPC serialises requests for the same household/source/recipe and accepts the desired state rather than an ambiguous toggle. RLS and recipe visibility remain authoritative. Active members may save currently available household recipes and public shared recipes only.
- Existing household recipe favourites migrate to the relation. Legacy public/global flags are deliberately not assigned to households. Reads use the relation as the authoritative household preference.
- Source-qualified UI keys prevent household/imported ID collisions. Switching households remounts the library and ignores previous requests. Focus, visibility and a 30-second visible-page refresh bring other members' changes and withdrawn recipes into view. Responses that began before a local favourite mutation cannot overwrite it.
- No new dependencies, paid provider requests or Edge Function changes. A$0 additional fixed monthly/annual service cost; ordinary database reads/writes remain within existing infrastructure.

## Verification

Local synthetic database rebuilt from all migrations and seed: 539 pgTAP assertions across 33 files passed, including 18 new favourites assertions. These cover both source types (including matching UUIDs), idempotence, member sharing/removal, unrelated and inactive membership, private/unpublished recipes, forged writes and anonymous access. Database lint and security advisors report no issues.

Six real local PostgREST/repository checks passed: concurrent member saves leave one row; members share state; member removal reaches the owner; a non-owner can save a public recipe; another household does not inherit the preference; a forged household mutation is rejected. The first API attempt met a stale schema cache following the synthetic rebuild; reloading the local PostgREST schema resolved it. The application and RLS required no relaxation.

Integration coverage includes optimistic card/detail feedback, duplicate suppression, search plus filtering, failed-save recovery, another member's focus refresh, removal of inaccessible recipes and late responses after household switching. Browser coverage exercises the real app with synthetic repositories, keyboard interaction, 320px overflow and axe checks. Local format, lint, types and production build pass, with 589 tests across 78 files. All 30 browser checks pass; the two favourites checks also pass after the dialog status change. Preflight and the documentation command audit pass. Exact-head CI is recorded in the PR once complete.

These are local/synthetic checks, not proof of hosted authenticated behaviour. No production data/configuration, provider evaluations or processing budgets were changed. Physical Safari/VoiceOver and hosted two-member validation remain release checks.

## Release and rollback

Migrations in this PR: yes — `20261005111000_household_recipe_favourites.sql`.

Edge Functions changed in this PR: no.

Hosted migration required after merge: yes. Apply the migration before using the new library code; the new reads require the relation and mutations require its RPC. After release, verify two active household members can save/remove both source types and see shared results, and an unrelated household remains separate. A public page smoke alone is insufficient.

Rollback the UI if required and retain the additive relation. Forward-fix released schema; do not rewrite applied migration history. Legacy columns remain for compatibility but do not represent the new household preference.

## Integration after PR196

Integrated accepted main `754579745957f70edfa88b30cc3396f605b518bc`. Recipe detail keeps PR196's original-source link and concise metadata alongside the favourite action/status. No Home redesign. Existing Shopping repair, public-recipe protections and HTTP/WebKit regression contracts are retained. Exact-head integration checks are reported in PR190. Migration `20261005111000` predates released PR195: release requires reviewed remote history and the protected Production database release workflow on approved main with `allow_out_of_order_migrations: true` (`--include-all`), after confirming the complete pending set. No Edge Function release. No production release was run here.
