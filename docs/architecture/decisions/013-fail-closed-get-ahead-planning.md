# ADR 013: Fail closed when Get Ahead intelligence is unavailable

- **Status:** Accepted
- **Date:** 2026-08-03

## Context

Get Ahead previously treated deterministic extraction as a safe fallback for provider, activation
and enrichment failures. Real household testing showed that this exposed copied recipe prose and
stale sessions as apparently useful preparation advice. It concealed an incomplete v2 enrichment
rollout and made a released feature appear functional when the real planning path had failed.

## Decision

Get Ahead returns a calm unavailable or “recipes are still preparing” state unless it can produce a
current, validated, model-assisted plan from Recipe Intelligence v2. The household flow never
creates or resumes a checklist from deterministic recipe extraction or an obsolete planner
version. Missing v2 coverage triggers a bounded durable-queue dispatch. Activation and hosted
evaluation require every current recipe version to have completed v2 enrichment with no unfinished
v2 jobs.

This is a Get Ahead-specific exception to ADR 005's general preference for useful deterministic
fallbacks. Deterministic validation, eligibility, time fitting and safety boundaries remain
authoritative; only the misleading user-visible fallback plan is removed.

## Alternatives

- **Keep showing deterministic tasks:** Rejected because real sessions proved they were misleading
  and materially less useful than no plan.
- **Keep a stale saved session during errors:** Rejected because it hides failed releases and can
  show tasks for obsolete meals, versions or planner rules.
- **Fail closed with automatic recovery:** Accepted because it preserves trust while the durable
  enrichment queue progresses without household setup.

## Consequences

Get Ahead can be temporarily unavailable while enrichment completes or the model provider is down.
The UI states that plainly and offers a retry. Release operations must finish recipe enrichment
before evaluation and activation. Retry replaces the saved checklist with the returned current
plan, and planner-version migrations remove obsolete fallback records.

## Security impact

No new user permissions are introduced. The enrichment dispatch uses the existing internal worker
token, while household membership and RLS checks remain before privileged recipe-intelligence
loading. Readiness probes are executable only by `service_role`. Recipe text and provider payloads
remain excluded from logs.

## Cost impact

Fixed cost is A$0 per month and A$0 per year. Automatic recovery processes only already-queued,
bounded enrichment work under existing daily and monthly provider limits.

## Migration impact

A forward migration advances weekly planner, prompt and corpus identities to v8, disables AI,
clears smoke evidence, removes obsolete saved fallback plans and adds the enrichment-readiness
activation gate. Released migrations remain immutable. Rollback uses the emergency stop and a new
forward migration.

## Product Principles supported

Principles 1, 2, 3, 4, 5 and 10. The decision removes misleading household work, makes failure
honest, preserves source-linked intelligence and prevents synthetic evaluation from authorising an
incomplete real recipe pipeline.

## Rollback or reconsideration trigger

Reconsider only if Cooksmith can produce a deterministic fallback that independently meets the
same real-recipe usefulness, source-traceability and release-gate evidence as the model-assisted
path.
