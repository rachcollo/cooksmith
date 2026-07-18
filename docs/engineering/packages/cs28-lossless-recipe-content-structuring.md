# Engineering Package — CS-28: Lossless Recipe Content Structuring

**Status:** Ready for Build  
**Branch:** `cs28-lossless-recipe-content-structuring`  
**Base branch:** Latest `main`  
**Delivery pairing:** Build and validate with CS-27  
**Depends on:** CS-19 / Milestone 9B  
**Blocks:** CS-20 and CS-30

---

## 1. Objective

Create a deterministic backend workflow that turns the easy multiline input from CS-27 into ordered, reusable recipe content without sacrificing the original text. The source entered by the user remains authoritative; derived structure exists to support display, search, future shopping workflows, and Cook With Me.

## 2. Data Contract

Persist both:

1. lossless source text for ingredients and instructions; and
2. versioned derived records with stable ordering and the original line text.

Minimum metadata:

- parser/derivation version;
- derivation status and timestamp;
- ordered position;
- original line text;
- optional normalized fields only when confidently derived.

Never require a successful normalization to save valid source text.

## 3. Derivation Rules

### Ingredients

- Split source into ordered non-empty logical lines.
- Preserve the original trimmed display line.
- Recognise common quantities and units only as optional derived metadata.
- Support decimals, vulgar fractions, slash fractions, ranges, Unicode, parenthetical notes, and lines without quantities.
- Do not invent missing quantities, units, or ingredient names.
- Ambiguous lines remain valid display lines with nullable normalized fields.

### Instructions

- Split multiline source into ordered logical steps.
- Treat non-empty lines as the first-release default.
- Remove only clearly decorative numbering from derived display text; keep source text unchanged.
- Do not split sentences heuristically when the author supplied one line.
- Preserve paragraph/line order and punctuation.

### Reprocessing

- Derivation must be deterministic and idempotent for a parser version.
- A new parser version may rebuild derived rows without changing source text.
- Reprocessing must be explicit, observable, safe to retry, and household scoped.
- Do not add an LLM or paid extraction service in the first implementation.

## 4. Persistence and Migration

- Use additive forward migrations only.
- Backfill source text for existing CS-19 recipes deterministically from ordered child rows.
- Retain existing child data until the compatibility path has been verified.
- Save recipe metadata, source fields, and derived rows atomically.
- Replace derived rows safely without exposing partial results.
- Maintain stable ordering, audit timestamps, foreign keys, indexes, and household RLS.
- Update generated database types and repository mappings.
- Document rollback and production migration discipline.

## 5. API and Domain Boundary

Expose a small pure derivation contract, for example:

- input: ingredient source, instruction source, parser version;
- output: ordered ingredient records, ordered instruction records, warnings/status.

The repository owns persistence and transactions. UI code must not independently implement parsing rules. Imported recipes from CS-30 must use the same contract after the user reviews the extracted text.

## 6. Failure Behaviour

- Valid source text saves even when optional normalization cannot be produced.
- A derivation failure must not destroy the last valid source or derived content.
- Surface an actionable internal status for retries and diagnostics.
- User-facing recipe detail falls back to safe line rendering.
- Logs must not expose other households’ recipe content or secrets.
- Repeated requests must not create duplicate child rows.

## 7. Security and Privacy

- Enforce household membership through existing RLS policies.
- Never use service-role credentials in normal client flows.
- Treat all recipe text as untrusted plain content.
- Bound input sizes in validation and database contracts with a documented, family-recipe-friendly limit.
- Ensure parser errors do not reflect unsafe HTML or internal details.

## 8. Testing Requirements

### Unit

- empty lines, whitespace, CRLF/LF, long lines, punctuation, Unicode;
- decimals, fractions, ranges, optional units, and ambiguous ingredients;
- numbered, bulleted, and unnumbered instruction lines;
- stable ordering, determinism, idempotency, and parser-version changes;
- source preservation and safe failure fallback.

Use fixture-based tests based on varied recipe styles without copying copyrighted recipe bodies unnecessarily.

### Integration and Database

- atomic create/edit of source plus derived rows;
- CS-19 backfill and compatibility;
- retry/reprocessing does not duplicate or reorder records;
- failure preserves last recoverable data;
- cross-household access and reprocessing are rejected;
- generated types match the migrated schema;
- archive and restore flows preserve content.

## 9. Operational Requirements

- Record derivation version and status so stale records can be measured.
- Provide enough structured logging to diagnose failures without logging full private recipes by default.
- Document any backfill command, expected runtime, retry behaviour, and rollback.
- Keep the first-release workflow synchronous unless measurements demonstrate a need for background processing.
- If asynchronous processing is later introduced, preserve transactional source saving and explicit pending/failed states.

## 10. Acceptance Criteria

CS-28 is complete when:

- multiline source is stored losslessly and remains authoritative;
- deterministic derived ingredient and step records are available in order;
- ambiguous content saves without invented data;
- existing CS-19 recipes migrate without loss;
- parser versioning and safe reprocessing are supported;
- saves are atomic, idempotent, and household isolated;
- CS-27 and CS-30 consume the same derivation boundary;
- automated, migration, RLS, CI, and hosted-preview checks pass;
- completion and handover notes document the contract and operational workflow.

## 11. Deliverables

- additive schema and backfill migration;
- pure versioned derivation module;
- transactional repository integration;
- generated database types;
- fixture-based unit tests and database/RLS tests;
- migration, rollback, observability, completion, and handover documentation.

## 12. Concurrency Boundaries

Coordinate schema, types, repository contracts, and tests directly with CS-27. CS-20 and CS-30 should start after this contract and CS-27 are merged; they may then proceed concurrently. CS-29 is a later consumer and must not expand this package into a cooking-mode UI.
