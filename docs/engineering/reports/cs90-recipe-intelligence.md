# CS-90 completion report: Recipe Intelligence foundation

- **Baseline:** `main` at `a0f22d5cde5e1355d5f879eafb782e0ba505273b`
- **Branch:** `feat/cs-90-recipe-intelligence`
- **Status:** Implemented; database CI and hosted provider evaluation pending

## Outcome

Cooksmith now has a deterministic-first, version-aware recipe enrichment contract, durable processing jobs, household-isolated validated results, atomic stale-safe activation, protected backfill and a server-only OpenAI adapter. Approved recipe content and existing product journeys remain unchanged.

## Evaluation

The committed deterministic corpus covers metric, imperial, range, approximate and unknown quantities; aliases; ambiguous links; and meaningfully different preparation actions. Automated assertions require original source preservation and reject invented source identifiers.

Provider-assisted evaluation is intentionally pending until the migration and Edge Function exist in an isolated Preview environment with approved secrets. AI remains off by default. Unsafe or invented guidance remains release-blocking and CS-81 remains blocked until that evaluation is accepted.

## Security, privacy and cost

- Browser roles cannot read jobs or settings and cannot write enrichment records.
- Active results and content provenance are household-scoped with RLS.
- The worker requires a separate secret token and uses server-only Supabase/OpenAI credentials.
- Provider requests contain only unresolved synthetic/source excerpts and stable IDs; raw payloads are not persisted or logged.
- Deterministic processing costs A$0.
- Provider usage is variable and disabled by default. The worker calculates recorded A$ cost from server-configured, date-reviewed per-million-token rates and enforces daily/monthly limits.

## Release order

1. Merge the reviewed implementation PR.
2. Run the protected Production database release for the exact accepted `main` SHA.
3. Confirm the required Edge Function secrets without printing them.
4. Run the protected Production Edge Function release for the same accepted SHA.
5. Keep AI disabled until Preview evaluation and explicit cost acceptance complete.

No production database, function, secret or provider was accessed during implementation.
