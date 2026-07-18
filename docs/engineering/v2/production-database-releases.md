# Production database releases

Cooksmith releases hosted database migrations through the manually triggered
`Production database release` GitHub Actions workflow. Normal pull-request and
`main` CI remain isolated and never connect to hosted Supabase.

## One-time GitHub setup

Create a GitHub environment named `production-database`. Configure a required
reviewer and prevent administrators from bypassing its protection where the
repository plan supports those controls. Store these environment secrets:

| Secret                  | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase personal access token used only by the release runner |
| `SUPABASE_PROJECT_REF`  | Exact reference of the approved Cooksmith hosted project       |
| `SUPABASE_DB_PASSWORD`  | Database password for that project                             |

Never use browser keys, the service-role key, SMTP credentials, or a database
connection string in place of these values. Never put their values in a pull
request, issue, workflow input, log, or repository file.

## Release procedure

1. Merge the reviewed database pull request into `main` and wait for Cooksmith
   quality to pass on the exact merge commit.
2. Confirm the target project and a current backup or recovery point in
   Supabase. Record the forward-fix owner and release window.
3. In GitHub, open **Actions → Production database release → Run workflow**.
4. Select `main`, enter the full approved `main` commit SHA, and enter
   `DEPLOY_PRODUCTION_DATABASE` as confirmation.
5. Approve the `production-database` environment deployment when prompted.
6. Review the dry-run and deployment output. The job links only the approved
   project, applies pending migrations in repository order, and confirms that
   migration history is current.
7. Perform the release-specific application and RLS smoke checks without using
   real household data.

The workflow cannot run from a feature branch, does not seed or reset the
database, and serialises releases so two migrations cannot run concurrently.

## Failure and recovery

Stop if linking, history inspection, or the dry-run identifies an unexpected
project or migration state. Do not repair history or paste SQL into the
Dashboard as a workaround.

Released migrations are immutable. Correct a defect with a reviewed,
timestamped forward migration and a regression test. Use Supabase recovery only
under an approved incident plan when a forward fix cannot safely preserve data.

## Current invitation release

The Milestone 6C release includes
`20260715143724_add_household_invitations.sql`. The workflow also applies any
earlier repository migration that is genuinely absent from hosted migration
history. After release, verify onboarding, owner invitation creation,
invitation acceptance, duplicate prevention, cancellation, member removal, and
immediate access revocation with synthetic accounts.

## Production Edge Function releases

Cooksmith deploys production Edge Functions separately from database migrations through
the manually triggered `Production Edge Function release` workflow. The workflow uses
the existing protected `production-database` environment, its required reviewer, and
the existing `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` secrets. It does not
require or expose the database password.

After the matching database migration succeeds:

1. Open **Actions → Production Edge Function release → Run workflow**.
2. Select `main`.
3. Paste the full 40-character commit SHA currently at the tip of `main`.
4. Enter `DEPLOY_PRODUCTION_EDGE_FUNCTION` as confirmation.
5. Approve the protected environment deployment when prompted.
6. Confirm the workflow deploys `import-recipe` and verifies that JWT validation remains
   enabled.
7. Smoke-test a supported public URL, an invalid URL, and private/public save behaviour
   with synthetic accounts.

The workflow deploys only the named `import-recipe` function. It does not prune other
hosted functions. Release database changes first, then the Edge Function, and finally
perform the production application smoke test.
