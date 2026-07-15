# Temporary main MVP workflow completion report

## Status

Implemented, deployment validation pending.

## Baseline

- Source branch: accepted `v2`
- Source commit: `7c937e6ba064da210ce1f83b6d1e55b73f36adef`
- Previous `main`: `0ae700388520914eaa6b5c12710c3f431c85c385`
- Relationship: previous `main` is an ancestor of accepted `v2`
- Milestones 5A, 5B, 5C and 6A are present

## Change

The temporary workflow is `feature branch → main → automatic Vercel deployment`. Repository instructions, CI targeting, release checks, authentication canonical-URL guidance and environment documentation now use `main`. ADR 009 supersedes the dedicated integration-branch decision until public beta.

Historical reports and handovers retain their original `v2` references because they record accepted facts at the time.

## Security, production and cost

No application source, database migration, secret, credential, Vercel project, custom domain or provider tier changed. This workflow does not authorise real customer data or public launch. Cost impact is A$0 monthly and A$0 annually.

## Validation and deployment

Final local, GitHub and Vercel evidence will be recorded after the pull request is published and merged.

## Reinstating staging

Before public beta, create a replacement ADR and reinstate `feature branch → staging → production`, including explicit environment, database and release approval controls.
