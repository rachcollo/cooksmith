# #234 repair prerequisite clarification

- Date: 2026-11-19
- Branch: `chore/cs234-repair-prerequisites`; target: `main`
- Verified baseline: `7311e08367eea03dea4c4747f4747073d745231b`
- Status: governance proposal only; final head/tree, review and CI recorded in the PR.

## Authority and outcome

Rach directly answered the specific Done-prerequisite question: “Yep i'm happy to
remove that rule so you can keep going, then we move to jira done after the final
check.” This authorises this one-off governance proposal despite the repository
freeze; it is not merely coordinator permission and does not override platform
security or prior denials. No claim is fabricated. The proposal permits only the
selected #234 engineering repair after acceptance/merge and fresh selection.

## Verified technical baselines

GitHub reports each PR merged; each merge SHA below is an ancestor of the verified
main above (`git merge-base --is-ancestor` returned zero for all six):

| Story  | PR                                                     | Merge SHA                                  |
| ------ | ------------------------------------------------------ | ------------------------------------------ |
| CS-79  | [185](https://github.com/rachcollo/cooksmith/pull/185) | `facd3e5613f41c81dfc6e7915a370244a4ccbf54` |
| CS-79  | [186](https://github.com/rachcollo/cooksmith/pull/186) | `8592a4ff454aa3ced94106c7aabce48607d24a88` |
| CS-79  | [187](https://github.com/rachcollo/cooksmith/pull/187) | `eb498acd57cef00f5ce9da3821238ba69a945471` |
| CS-101 | [188](https://github.com/rachcollo/cooksmith/pull/188) | `b2fb576ebce250e325df297670d62df18c523339` |
| CS-101 | [194](https://github.com/rachcollo/cooksmith/pull/194) | `c7b045ccb6ef076869b7ac3ff25fc77a0aed6e88` |
| CS-101 | [195](https://github.com/rachcollo/cooksmith/pull/195) | `fb8e3e2fd5afd452077696fcea4bfa28a27a7517` |

Existing #234 head remains `1e63e592af50366c15fc6ec059823653c8eda02d` on
`feat/cs-116-database-expansion`. Fresh Jira reads show CS-79 and CS-101 In Review;
no status or link changes were made. Code ancestry is not proof of final acceptance.
No cooksmith-builds refs were present at discovery; historical branches, claims,
receipts and evidence are preserved. Old-owner/session cessation remains unproven.

## Outstanding acceptance and boundaries

The [runbook](../../operations/BUILD_ADMISSION.md#selected-234-repair-merged-baseline-versus-release-acceptance)
retains CS-79 product acceptance of supported conversions, sources, precision and
fallback, and CS-101 hosted Shopping refresh/idempotence/overrides/isolation and
Get Ahead current-result/cache validation before relevant production release.
Temporary unavailable/preparing Get Ahead behaviour was accepted; this proposal
adds no zero-downtime requirement. No fabricated Done transition or acceptance.

## Validation, release and handoff

Run formatting, docs audit, governance and secret checks plus full required CI;
record actual results and exact-tree independent review in the PR. No application,
database, dependency, generated-type, workflow, provider or admission-script change.
No hosted product validation is claimed. No #234 repair, #228 adoption, live claim,
archive retry, merge, deployment, scheduler restart, paid backfill or credential work.
A$0 additional monthly/annual cost. Withdraw the allowance by stopping selection;
preserve branches, receipts and release gates. After human acceptance/merge, the
supervisor must reselect only #234 and recheck every remaining prerequisite.
