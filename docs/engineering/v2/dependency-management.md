# v2 dependency management

## Policy

Cooksmith v2 uses npm with exact package versions and a committed `package-lock.json`. Node.js and npm versions are pinned in `.nvmrc` and `package.json` so clean local and CI installs use the same baseline.

Use `npm ci` for ordinary setup and CI. It fails when the manifest and lockfile disagree and does not rewrite dependency resolution.

## Adding or updating a package

1. Confirm the package supports an approved, current milestone requirement.
2. Prefer an existing platform or browser capability when it is simpler and accessible.
3. Review maintenance, licence, security posture, browser weight and transitive dependencies.
4. Install an exact version with `npm install --save-exact <package>@<version>` or `npm install --save-dev --save-exact <package>@<version>`.
5. Commit both `package.json` and `package-lock.json`.
6. Add or update behaviour-focused tests and run `npm run validate`.
7. Record the reason in the pull request. Apply the cost checklist if the dependency introduces a provider or hosted service.

Do not perform broad dependency upgrades as part of an unrelated feature. Automated update pull requests may be enabled later once ownership and review cadence are agreed.

## Browser test dependency

Playwright is pinned as an npm package, but its Chromium binary is installed separately with `npm run test:e2e:install`. CI uses `playwright install --with-deps chromium` to install the matching browser and Linux system libraries.

Supabase CLI 2.109.1 is pinned as an npm development dependency. Always run it through the documented npm database scripts so local and CI use the same version. The CLI binary is reproducible through the lockfile; its local services still require Docker-compatible images.
