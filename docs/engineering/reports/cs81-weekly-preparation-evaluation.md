# CS-81 weekly preparation evaluation

## Scope

The automated evaluation uses 30 synthetic weekly plans. Each plan contains three recipes with
traceable recipe, version, ingredient and step identifiers. Twenty plans contain fully compatible
onion preparation. Ten include a meaningful cut difference.

## Results

| Measure                                |                                     Result |
| -------------------------------------- | -----------------------------------------: |
| Plans evaluated                        |                                         30 |
| Resolved deterministically             |                                  30 (100%) |
| Requiring a model call                 |                                     0 (0%) |
| Structurally valid output              |                                  30 (100%) |
| Correct compatible consolidation       |                               20/20 (100%) |
| Correct meaningful-difference grouping |                               10/10 (100%) |
| Unsupported or invented references     |                                          0 |
| Fallbacks                              |                                          0 |
| Local deterministic latency            | Covered by the Vitest run; no network call |
| Estimated provider cost                |                        A$0 for this corpus |

This corpus proves the deterministic and traceability contract. Hosted model quality, latency and
token cost remain a Preview release check before AI configuration is enabled. AI is disabled by
default, and rejected, unavailable or timed-out model output uses the persisted deterministic
fallback.
