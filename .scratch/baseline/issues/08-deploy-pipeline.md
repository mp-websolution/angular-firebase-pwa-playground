# 08: Deploy pipeline (FTP + Firebase rules)

**Spec:** `.scratch/baseline/spec.md`

**What to build:** A merge to `main` automatically deploys the Playground to production. A developer can also deploy any `vX.Y.Z` tag manually, e.g. from a `release/*` branch or to roll back. Each deploy re-runs the checks, uploads the production build over FTP to the webspace (ADR 0002), and deploys Firestore and Storage rules to the production Firebase project from the same commit, so client and rules never drift.

**Blocked by:** 03 (Sign-in with email/password and Google), 06 (PWA shell and update prompt)

**Status:** ready-for-agent

- [x] The deploy workflow is triggered by a push to `main` and by `workflow_dispatch` with a required tag input that is validated against `vX.Y.Z` and checked out
- [x] Deploy jobs run in the GitHub `production` environment and read all secrets from it (FTP server, username and password; Firebase service-account key; production project ID if not committed)
- [x] Lint, unit tests, integration tests and the production build run first. The deploy fails if any fail
- [x] The frontend is uploaded with `SamKirkland/FTP-Deploy-Action` over plain FTP with state-file sync, into the configured server folder
- [x] `firebase deploy --only firestore:rules,storage` runs against the production project using the service-account key
- [x] Concurrent deploys are serialised, so two runs never upload at the same time
- [x] The production environment config holds the real Firebase web config (committed), or a clearly marked placeholder plus the setup step that fills it
- [x] Workflow syntax is validated (e.g. with actionlint). The first live deploy is left for a human after the manual setup, and the ticket's comments record that

## Comments

### Implementation notes

- The PR checks moved into the reusable `.github/workflows/checks.yml` (`workflow_call`, optional `ref` input). `pr.yml` calls it, and so does `deploy.yml`, so a deploy runs exactly the PR checks. The check names are now `checks / lint-test-build` and `checks / integration`; the `main` ruleset doesn't require any status checks yet, so nothing broke. Ticket 09's rulesets should require these two names.
- `deploy.yml` has three jobs. `resolve-commit` pins the commit once: `GITHUB_SHA` on a push to `main`; on `workflow_dispatch` the `tag` input must match `^v[0-9]+\.[0-9]+\.[0-9]+$` and is resolved through `refs/tags/<tag>` (a branch with the same name can't stand in). `checks` and `deploy` both check out that SHA.
- `deploy` runs in the `production` environment. It reads `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR` and `FIREBASE_SERVICE_ACCOUNT` from it. The production project ID is not a secret: it is read from the committed `src/environments/environment.ts` (Node 24 strips the types), so the rules always go to the project the client talks to. While the `REPLACE_ME` placeholder is there, the deploy fails with a message pointing at that file, before anything is uploaded.
- Rules go first, then the FTP upload (the user confirmed this after review, and the spec now says so). A rules deploy is the likelier step to fail on a setup mistake (key, roles), and failing it before the upload keeps the old client and old rules together. If the FTP upload fails afterwards, re-running the deploy fixes it.
- FTP: `SamKirkland/FTP-Deploy-Action` v4.4.0 (pinned by SHA), `protocol: ftp`, `local-dir: ./dist/angular-firebase-pwa-playground/browser/`, `server-dir` from `FTP_SERVER_DIR` (must end in `/`). The default state file `.ftp-deploy-sync-state.json` on the server drives the sync. `.htaccess` is not excluded by the action's default excludes and is in the build root.
- Concurrency is at workflow level: group `deploy-production`, `cancel-in-progress: false`. Runs go one at a time in start order; a newer run replaces one that is still waiting, so an older commit never deploys over a newer one. The flip side: a waiting manual rollback is cancelled if a merge to `main` starts after it (README says so).
- `workflow_dispatch` runs `deploy.yml` from the branch picked in the UI, so the README tells you to allow only `main` in the `production` environment's deployment branches. Otherwise a pushed branch with a changed workflow could read the secrets. Manual deploys therefore run from `main`, with the tag as input.
- The production web config stays a clearly marked placeholder. The README's new "Deploy" section lists the step that fills it and the `production` environment secrets. Ticket 09 owns the full setup README.
- Validated with `actionlint` 1.7.12 (Docker image `rhysd/actionlint`, includes shellcheck): 0 errors in all three workflows. Locally: the project-ID step prints `REPLACE_ME` and the guard trips; the tag regex rejects `x` and accepts `v1.20.3`; resolving a missing tag through the API fails.
- Not run: no live deploy. The `production` environment, its secrets, the Firebase project and the web config don't exist yet. The first live deploy is left for a human after that manual setup, and it also verifies the service-account roles (README guesses Firebase Rules Admin, Firebase Viewer and Service Usage Consumer) and the `.htaccess` on Apache.
