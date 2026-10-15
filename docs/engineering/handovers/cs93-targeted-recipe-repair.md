# CS-93 handover: Selected recipe repair

- Date: 2026-10-15
- Branch: `fix/cs-93-targeted-recipe-repair`
- Target: `main`
- Baseline: `4f2aaa225f3ea4fe4e812f3e709f0f276ac92db7`
- Status: Implemented, manual validation pending
- Package: [Selected recipe repair](../../../engineering/ready/cs93-targeted-recipe-repair.md)

## Objective and product impact

Admin → Recipes now lets an administrator inspect one recipe's current-rule coverage and failure category, confirm a single repair, and review its recorded outcome and estimated A$ cost. This supports household trust and removes manual production commands. The original recipe remains unchanged.

## Implementation

The existing Retry action invoked the shared worker queue. Its replacement reserves an exact source/version job with a durable request and actor identity. The worker claims that job through the caller's admin-authenticated database boundary, attempts it once, and returns without chaining. Ordinary dispatch excludes reserved jobs; infinite availability also protects reservations from older workers during release/rollback.

Reservation is idempotent. Processing or unknown spend blocks another attempt. An expired lease remains visible for review rather than silently retrying. Stale pending reservations are cancelled without a provider call. Source validation, provider limits, AI controls and existing activation checks remain in force. A missing cost is never displayed as zero.

Files span the Admin application port/adapter/page, enrichment worker, generated types, one migration, and database/UI/worker/browser tests. No dependencies were added. The test TypeScript project now includes the enrichment handler so execution tests also type-check it.

## Database and release

Migration: `20261015234346_targeted_recipe_repair.sql` adds job audit/reservation columns and private admin-definer functions behind exposed invoker wrappers. PUBLIC/anonymous execution is revoked; household members cannot inspect, reserve or claim operational work. Existing private table privileges remain unchanged.

The PR does not deploy Production. After explicit merge/release approval, use the protected **Production database release** workflow for the exact approved main SHA, with dry-run and migration-history verification. Then release `enrich-recipe` and the UI from that SHA. Released migrations are immutable; fixes use forward migrations. No new environment variables are needed.

## Validation

Local reset and schema lint pass. Full pgTAP: **744 assertions, 42 files**, including 30 targeted-repair assertions. Generated database types are current. Worker execution tests: **6 passed**; selected Admin interaction tests: **6 passed**. Desktop/mobile Chromium: **50 passed, 2 existing skips**; the final repair recovery change also passed both targeted browser checks. **712 application tests in 98 files passed**, along with formatting, lint, type-check and build. GitHub CI and hosted evidence are recorded separately in the PR.

Initial fixture failures were corrected: a mock supplied invalid JSON for the secret-key bundle, and a privilege test expected zero rows where the correct behaviour is permission denied. The first npm reinstall used an unavailable home cache; `npm ci --cache /tmp/cooksmith-npm-cache` passed. Preflight requires this environment's native pinned Supabase CLI override. These are local environment/test setup issues, not waived product failures.

## Hosted and manual verification

Not performed. The production features remain paused; this implementation grants no authority to enable them, accept evaluation, run a repair or incur spend. After an explicitly approved release, an authenticated owner should select a synthetic/approved recipe, verify current-rule and failure details, authorise exactly one attempt, then review result and cost before any further action. Confirm another queued recipe remains untouched, original text is identical, and Get Ahead uses the resulting valid enrichment through the normal household path. Public preview smoke is not functional proof.

Local browser fixtures use synthetic data and stubbed repositories; worker tests mock provider responses. Local WebKit is unavailable because system libraries are missing; CI must supply that browser evidence. Physical device and assistive technology checks remain manual.

## Accessibility, security, privacy and cost

The selected heading receives keyboard focus, status feedback is announced, and buttons have explicit names. The new 320px browser check tests outcome/cost, overflow and serious/critical axe findings. No raw provider response, recipe text, credentials or household identity is returned by inspection. Audit actor is derived server-side. Staged secret scanning is required before commit.

Implementation/provider spend: **A$0**. New recurring services: **A$0 monthly / A$0 annually**. Future explicit repairs use existing provider budgets; unknown costs require operator review.

## Rollback and deferred work

Revert the UI/worker if needed; retain additive schema/audit evidence and use a forward migration for database correction. Reserved jobs cannot be consumed by the older worker. No production repair, paid evaluation, AI enablement, evaluation acceptance, merge or deployment was performed. CS-108 prompt editing and CS-109 bulk pantry remain deferred. No next milestone has begun.
