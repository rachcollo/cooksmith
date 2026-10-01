# CS-81 weekly preparation evaluation

## Scope

The automated evaluation uses 30 synthetic weekly plans. Each plan contains three recipes with
traceable recipe, version, ingredient and step identifiers. Twenty plans contain fully compatible
onion preparation. Ten include a meaningful cut difference.

## Original deterministic results

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

This original corpus proves the deterministic and traceability contract only. It made no provider
calls and is not hosted AI evidence. The later accepted CS-94 production evaluation below supplies
provider quality, latency and cost evidence; it does not establish a fresh Preview browser pass.

## Hosted CS-94 evidence reconciled on 1 October 2026

Production records contain accepted evaluation `a98fce1f-88f6-45c6-8676-639c56cb1551`.
Corpus, planner and prompt are v13; model is `gpt-4.1-mini`.
Deployment SHA: `45262a232cdb9e17ff6f0c5c2b6166918f003383`.
Explicit acceptance: 10 August 2026, 11:12:11 UTC. Hosted smoke verification references
the same SHA at 10:49:30 UTC.

| Measure                                | Recorded result |
| -------------------------------------- | --------------: |
| Plans evaluated                        |              30 |
| Deterministic cases                    |        2 (6.7%) |
| Actual model calls                     |      28 (93.3%) |
| Valid-output count                     |              28 |
| Reviewed quality passes                |   29/30 (96.7%) |
| Unsupported-data count                 |               0 |
| Fallback count                         |               0 |
| Total recorded case latency            |       57,370 ms |
| Mean latency over all 30 cases         |        1,912 ms |
| Mean latency over 28 model cases       |        2,049 ms |
| Input tokens                           |          40,771 |
| Output tokens                          |           1,895 |
| Total estimated cost                   |      A$0.021993 |
| Mean estimated cost per evaluated plan |     A$0.0007331 |

The run was completed and explicitly accepted under the current minimum 28/30 quality policy.
Case 9, `fresh-finishers-15m-9`, records `insufficient_meal_coverage`. This is a genuine
coverage limitation to retain under CS-94; it is not an unsupported-data failure. Case outcomes
include 27 model-assisted successes, one quality failure and two deterministic cases. Therefore
the aggregate valid-output count must not be presented as 28 quality successes or 30/30 quality.
An earlier accepted v13 run `0b2ba433-1501-4c11-83b1-ebcbdd601c66` recorded 30/30 quality,
28 model calls and A$0.022083 estimated cost.

These records supersede the original no-provider-evidence gap. Production AI is enabled, emergency
stop is inactive, and telemetry records 25 model-assisted attempts with latest activity on
7 September 2026. Ten saved v13 plans contain at least one task each. These are generation and
persistence evidence, not proof of every browser/cache/fallback journey or a current physical-device
accessibility pass. No new evaluation, provider call or configuration change was performed for
this reconciliation.
