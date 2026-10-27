# PWA Base

A template repo for trying out Angular and Firebase updates and ideas for future PWA projects, and the source of every **Project** built on its **Baseline**: sign-in, the user profile, Firebase wiring, PWA behaviour, tests, CI and an FTP deploy. Projects keep merging its **Baseline releases** (terms from `CONTEXT.md`).

How it all works, from development to deploy, is in the [Baseline manual](docs/baseline-manual.md).

This README is Project-owned: a Project replaces it with its own front page. The Baseline manual stays, and the Project never edits it.

## Setup

Create a Project by cloning the Template with its history and keeping it as the `upstream` remote. **Don't use GitHub's "Use this template":** it starts an unrelated history, so every later Baseline release would conflict on every file ([ADR 0008](docs/adr/0008-projects-keep-merging-baseline-releases.md)).

In short, starting from an empty GitHub repository and the newest Baseline release (see [Releases](docs/upgrade-notes.md#releases)):

```bash
git clone --no-tags --origin upstream https://github.com/mp-websolution/pwa-base.git my-project
cd my-project
git fetch upstream tag baseline-vX.Y.Z
git reset --hard baseline-vX.Y.Z
git remote add origin git@github.com:<owner>/<project>.git
git push -u origin main
git push origin baseline-vX.Y.Z
```

Each step is explained in the manual's [Setup](docs/baseline-manual.md#1-repository), which goes on through Firebase, the webspace and the first deploy. Later Baseline releases are merged as described in [Syncing Baseline releases](docs/syncing-baseline-releases.md).

## Docs

- [Baseline manual](docs/baseline-manual.md): development, Features, setup, deploy and updates, plus a table of every doc.
- [Syncing Baseline releases](docs/syncing-baseline-releases.md): how a Project merges a Baseline release.
- [Upgrade notes](docs/upgrade-notes.md): the four file groups and what each Baseline release asks of a Project.
- Glossaries: [`CONTEXT.md`](CONTEXT.md) for the Baseline, [`docs/project/CONTEXT.md`](docs/project/CONTEXT.md) for the Project, both listed in [`CONTEXT-MAP.md`](CONTEXT-MAP.md).
- Decisions: [`docs/adr/`](docs/adr/) for the Baseline, [`docs/project/adr/`](docs/project/adr/) for the Project.
- Agents: [`AGENTS.md`](AGENTS.md), plus the Project's own [`docs/project/AGENTS.md`](docs/project/AGENTS.md).
