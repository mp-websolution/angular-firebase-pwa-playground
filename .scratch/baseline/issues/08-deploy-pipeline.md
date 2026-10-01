# 08: Deploy pipeline (FTP + Firebase rules)

**Spec:** `.scratch/baseline/spec.md`

**What to build:** A merge to `main` automatically deploys the Playground to production. A developer can also deploy any `vX.Y.Z` tag manually, e.g. from a `release/*` branch or to roll back. Each deploy re-runs the checks, uploads the production build over FTP to the webspace (ADR 0002), and deploys Firestore and Storage rules to the production Firebase project from the same commit, so client and rules never drift.

**Blocked by:** 03 (Sign-in with email/password and Google), 06 (PWA shell and update prompt)

**Status:** ready-for-agent

- [ ] The deploy workflow is triggered by a push to `main` and by `workflow_dispatch` with a required tag input that is validated against `vX.Y.Z` and checked out
- [ ] Deploy jobs run in the GitHub `production` environment and read all secrets from it (FTP server, username and password; Firebase service-account key; production project ID if not committed)
- [ ] Lint, unit tests, integration tests and the production build run first. The deploy fails if any fail
- [ ] The frontend is uploaded with `SamKirkland/FTP-Deploy-Action` over plain FTP with state-file sync, into the configured server folder
- [ ] `firebase deploy --only firestore:rules,storage` runs against the production project using the service-account key
- [ ] Concurrent deploys are serialised, so two runs never upload at the same time
- [ ] The production environment config holds the real Firebase web config (committed), or a clearly marked placeholder plus the setup step that fills it
- [ ] Workflow syntax is validated (e.g. with actionlint). The first live deploy is left for a human after the manual setup, and the ticket's comments record that
