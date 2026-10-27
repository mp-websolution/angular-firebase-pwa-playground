# Baseline manual

How the Baseline works: what it is, development, Features, setup from zero to live, deploy and updates. The stack is Angular, the native Firebase SDK, Firebase emulators, Testing Library, GitHub Actions and FTP deploy.

This manual is a Baseline file: only the Template changes it, and a Project reads it, never edits it. A Project's own front page is its `README.md`, which is Project-owned.

## What this is

The repo is a **Playground** (terms from `CONTEXT.md`): the **Baseline** plus any **Features**.

- The **Baseline** is the minimal shell every Project inherits: sign-in (email/password and Google), the user profile with avatar, Firebase wiring, PWA behaviour (offline shell, update prompt), tests, CI and the deploy pipeline. It never depends on a Feature.
- A **Feature** is a self-contained piece of the app beside the Baseline, in `src/app/features/`. The notes page (`/notes`) is the example. Deleting a Feature leaves the Baseline intact. In the Playground a Feature is usually thrown away once tried; in a Project the Features are the product.
- As the **Template**, the repo is the source of every **Project**: see [Setup](#setup-from-zero-to-live). Changes flow one way, from the Template to Projects through **Baseline releases** ([ADR 0008](adr/0008-projects-keep-merging-baseline-releases.md), [upgrade notes](upgrade-notes.md)). A Project merges each one as described in [Syncing Baseline releases](syncing-baseline-releases.md).

The non-obvious choices are recorded as ADRs:

- [0001: Native Firebase SDK instead of AngularFire](adr/0001-native-firebase-sdk-instead-of-angularfire.md)
- [0002: FTP deploy instead of Firebase Hosting](adr/0002-ftp-deploy-instead-of-firebase-hosting.md)
- [0003: Lazy Firestore loader token](adr/0003-lazy-firestore-loader-token.md)
- [0004: Testing Library for component tests](adr/0004-testing-library-for-component-tests.md)

These are the Baseline ADRs, in `docs/adr/`. A Project records its own decisions in `docs/project/adr/`, numbered from 0001 on its own (see [Docs](#docs)).

## Agent skills

Run `npx skills install` to add the skills referenced in `skills-lock.json`.

## Development

Prerequisites:

- Node 24 (`.nvmrc`), e.g. `nvm use`.
- Java 21+, for the Firebase emulators.
- Firebase CLI: comes with `npm ci` as the `firebase-tools` dev dependency, used by the npm scripts and as `npx firebase`. No global install or login is needed.

No Firebase project or credentials are needed: development runs against the `demo-playground` emulators.

| Command | What it does |
|---|---|
| `npm start` | Assembles the rules, starts the Auth, Firestore and Storage emulators with the Emulator UI (http://localhost:4000), seeds them, then serves the app (http://localhost:4200). |
| `npm run rules:assemble` | Assembles the deployed rules into `assembled-rules/` (gitignored): `firestore.rules` and `storage.rules` with every Feature's fragments inserted (see [Features](#features)). `npm start`, `npm run test:integration` and the deploy call it. |
| `npm run seed` | Runs every seeder in `scripts/seed/`. Only works inside the emulators; `npm start` calls it. |
| `npm test` | Component tests. No emulators needed. |
| `npm run test:sheriff` | Sheriff tests (`sheriff-tests/`): lint fixture files with the real ESLint config and check that Sheriff's module boundaries (ADRs 0005–0007) hold. No emulators needed. |
| `npm run test:scripts` | Script tests (`script-tests/`): run the repo's scripts against throwaway fixtures in `script-tests/.fixtures/`. No emulators needed. |
| `npm run test:integration` | Assembles the rules, then runs the integration tests (`*.integration.spec.ts`), including the security-rules tests, inside the emulators. |
| `npm run lint` / `npm run format` | ESLint / Prettier. CI runs `npm run check` and `npm run test:integration`, and in a Project also `npm run baseline:check-drift`. |
| `npm run build` | Production build into `dist/browser/`. |
| `npm run check` | Every check that needs no emulator, in CI's order: Sheriff tests, script tests, lint, format check, component tests once, production build. Stops at the first failure. |
| `npm run deps:graph` | Prints Sheriff's JSON export of the project: each file's module, tags and imports. |
| `npm run icons` | Renders the app icons from `scripts/icons/` (see [App icons](#app-icons)). |
| `npm run baseline:update -- baseline-vX.Y.Z` | In a Project: merges that Baseline release on a new branch (see [Syncing Baseline releases](syncing-baseline-releases.md)). |
| `npm run baseline:check-drift` | In a Project: fails naming each Baseline file changed since the newest Baseline release merged (see [the Baseline drift check](syncing-baseline-releases.md#the-baseline-drift-check)). CI runs it in Projects, not in the Template. Not part of `npm run check`. |

After `npm start`, sign in as the seeded demo user `demo@example.com` with password `demo-password` (see `scripts/seed/01-demo-user.mjs`; its profile comes from `02-demo-profile.mjs`), create an account, or use "Sign in with Google": the Auth emulator opens a popup where you pick or add a fake Google account.

How tests are written is in `docs/agents/testing.md`.

Production builds are a PWA: Angular's service worker (configured in `ngsw-config.json`) is registered only there, never under `ng serve`. `public/.htaccess` ships with the build and gives Apache the SPA fallback to `index.html` and the cache headers.

Production builds need the production project's web config in `src/environments/environment.ts`. While it still holds the `REPLACE_ME` placeholder, the app throws at startup instead of failing later on its first Firebase call.

## Features

`docs/features.md` has the full steps and explains why a Feature's Firestore code stays behind its lazy route. In short, every Feature lives in `src/app/features/`, and everything else in `src/app/` is Baseline. A Feature owns 3 things, all modelled on the notes Feature:

1. Its route entry in `src/app/features/features.routes.ts` (home links to it by its title).
2. Its folder, e.g. `src/app/features/notes/`, including its rules fragments, e.g. `notes.firestore.rules` (and `<name>.storage.rules` if needed). `npm run rules:assemble` inserts them into the Baseline's `firestore.rules` and `storage.rules`.
3. Its seeder, e.g. `scripts/seed/feature-notes.mjs`.

**Add** one by copying those 3 from the notes Feature and renaming. **Remove** one by deleting them, keeping at least one Feature, then run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`.

## App icons

The icons are rendered from two SVGs by `npm run icons` (needs Google Chrome; set `CHROME` to its path if it isn't `google-chrome` on the `PATH`):

- `scripts/icons/icon.svg`: the `any` icons (`public/icons/icon-<size>.png`) and `public/favicon.ico`. Its shape is what users see, so it may have transparent corners.
- `scripts/icons/icon-maskable.svg`: the `maskable` icons (`public/icons/icon-maskable-<size>.png`). The platform crops these to its own shape, so the background must be opaque and fill the square, with the artwork inside the central safe zone (a circle with 40% of the icon's width as radius).

To use your own icons, replace both SVGs (keep the 512 × 512 `viewBox`) and run `npm run icons`. Check the maskable one at [maskable.app](https://maskable.app). If you'd rather make the PNGs elsewhere, e.g. with [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator), keep the file names and sizes that `public/manifest.webmanifest` lists. Update `theme_color` and `background_color` there too, and the `theme-color` meta tag in `src/index.html`. Chrome DevTools → Application → Manifest should show no icon warnings.

## Setup: from zero to live

Every manual step a new Project needs, in order. None of them are scripted.

### 1. Repository

A Project is created by cloning the Template with its history and keeping the Template as the `upstream` remote ([ADR 0008](adr/0008-projects-keep-merging-baseline-releases.md)). **Don't use GitHub's "Use this template":** it starts an unrelated history, so every later Baseline release would conflict on every file. For the same reason the Template leaves **Template repository** unticked under Settings → General, so GitHub doesn't offer the button.

1. On GitHub, create an empty repository for the Project: no README, licence or `.gitignore`.
2. Clone the Template as `upstream`, without its tags, and move `main` to the newest Baseline release (the top entry under [Releases](upgrade-notes.md#releases) in the upgrade notes):

   ```bash
   git clone --no-tags --origin upstream https://github.com/mp-websolution/angular-firebase-pwa-playground.git my-project
   cd my-project
   git fetch upstream tag baseline-vX.Y.Z
   git reset --hard baseline-vX.Y.Z
   ```

   `--no-tags` also stops later fetches from `upstream` from bringing in the Template's `v*` deploy tags, which would mix with the Project's own. A Project fetches only the Baseline release it merges.
3. Add the Project's repository as `origin`, then push `main` and the Baseline release:

   ```bash
   git remote add origin git@github.com:<owner>/<project>.git
   git push -u origin main
   git push origin baseline-vX.Y.Z
   ```

   The Project's CI finds the Baseline release it last merged among the Project's own tags, so every merged release is pushed to `origin` too.
4. Run `npm ci` and `npm start` to check that it works locally.
5. Make it the Project's own, in Project-owned files only (the file groups are in the [upgrade notes](upgrade-notes.md#file-groups)): replace `README.md` with the Project's front page, set the app's name in `src/app-identity/app-identity.ts`, its colours in `public/manifest.webmanifest` and `src/index.html`, and its icons (see [App icons](#app-icons)). Delete the `github-actions` entry from `.github/dependabot.yml`: the Template's copy adds it so the Template bumps the actions in its workflows, and a Project gets those bumps with Baseline releases (see [Updates](#updates)). Add the Project's first Feature (see [Adding a Feature](features.md#adding-a-feature)) before deleting the notes Feature (see [Removing a Feature](features.md#removing-a-feature)), or in the same PR: home's test fails without a Feature. The Project's own terms, decisions and agent instructions go in `docs/project/` (see [Docs](#docs)).

From then on, the Project merges each new Baseline release as described in [Syncing Baseline releases](syncing-baseline-releases.md).

### 2. Firebase project

In the [Firebase console](https://console.firebase.google.com):

1. Create a project. Google Analytics isn't used.
2. **Firestore Database** → Create database, location `europe-west3` (Frankfurt), production mode. The deploy replaces its rules with the assembled `assembled-rules/firestore.rules`.
3. **Storage** → Get started, location `europe-west3`. New Storage buckets need the pay-as-you-go Blaze plan; set a budget alert in Google Cloud billing. The deploy replaces its rules with the assembled `assembled-rules/storage.rules`.
4. Project settings → Your apps → add a **Web app** (no Firebase Hosting). Its config object is the web config for [section 4](#4-web-config).

The location of Firestore and Storage can't be changed later.

### 3. Authentication

1. **Authentication** → Sign-in method: enable **Email/Password** and **Google**.
2. **Authentication** → Settings → **Authorized domains**: add the production domain, e.g. `playground.example.com`. Without it Google sign-in fails there. (`localhost` is already listed.)

### 4. Web config

Paste the web app's config into `src/environments/environment.ts` (see [Deploy](#deploy), step 1) and merge it through a PR like any change.

### 5. Service account for the rules deploy

In the [Google Cloud console](https://console.cloud.google.com) of the same project: IAM & Admin → Service accounts → Create service account, e.g. `github-deploy`.

1. Grant it the roles listed for `FIREBASE_SERVICE_ACCOUNT` in [Deploy](#deploy). They are a best guess: if the first deploy fails with a permission error, the error names the missing permission. Once a deploy has passed, update the list there.
2. Keys → Add key → JSON. The downloaded file is the value of the `FIREBASE_SERVICE_ACCOUNT` secret (step 7). Delete the local file afterwards.

### 6. Webspace

1. Create a subdomain, e.g. `playground.example.com`, with its own folder on the webspace as document root, e.g. `playground/`. The app is served from the root of that subdomain.
2. Turn on HTTPS for the subdomain: the service worker and sign-in need it.
3. Make sure Apache reads `.htaccess` in that folder (`AllowOverride`, with `mod_rewrite` and `mod_headers`). Most shared hosts allow it by default.
4. Note the FTP host, user and password, and the folder's path as the FTP user sees it. They are the `FTP_*` secrets in step 7.

### 7. GitHub `production` environment

Create the environment and its secrets as described in [Deploy](#deploy), step 2. Deployment branches must be restricted to `main`.

### 8. Rulesets

Settings → Rules → Rulesets. Nobody pushes to `main` directly, admins included, so every change, Dependabot's too, goes through the checks.

1. **Branches:** New branch ruleset, e.g. `protected branches`.
   - Enforcement status: **Active**. Bypass list: **empty**, so admins can't bypass it either.
   - Target branches: add **Include default branch** (`main`) and the pattern `release/*`.
   - Rules: **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** (0 required approvals, so a solo owner can merge), and **Require status checks to pass** with `checks / lint-test-build`, `checks / integration` and `checks / baseline-drift`. The checks are only offered once they have run in a PR, so open one first if the list is empty.
2. **Tags:** New tag ruleset, e.g. `release tags`.
   - Enforcement status: **Active**. Target tags: the patterns `v*` (deploy tags) and `baseline-v*` (Baseline releases, see `docs/upgrade-notes.md`).
   - Rules: **Restrict creations**, **Restrict updates** and **Restrict deletions**.
   - Bypass list: **Repository admin** only. On a personal repo that is the owner, so only the owner can create, move or delete either kind of tag, including pushing a merged Baseline release to a Project.

### 9. First deploy

Merge a PR to `main` (e.g. the web config from step 4). The **Deploy** workflow runs the checks, deploys the rules, then uploads the app. Then:

1. Open the production domain, create an account, sign in with Google and upload an avatar.
2. Confirm the service-account roles in [Deploy](#deploy).
3. Check that the app installs as a PWA (Chrome's address bar offers it).

## Deploy

`.github/workflows/deploy.yml` deploys to production on every merge to `main`. To deploy a release tag by hand (e.g. from a `release/*` branch, or to roll back), run the **Deploy** workflow from `main` in the Actions tab and enter the tag (`vX.Y.Z`). Each run re-runs the PR checks (`.github/workflows/checks.yml`), deploys the Firestore and Storage rules, then uploads the build over FTP, all from the same commit. Deploys run one at a time; while one runs, only the newest waiting run is kept, so a waiting rollback is cancelled if a merge to `main` comes after it.

Before the first deploy:

1. Paste the production project's web config into `src/environments/environment.ts`, replacing the `REPLACE_ME` placeholder. Its `projectId` is also where the rules go; the deploy fails while the placeholder is there.
2. Create a GitHub environment named `production`. Under **Deployment branches and tags**, allow only `main`: otherwise any pushed branch could run a changed workflow with these secrets. Then add these secrets:

| Secret | Value |
|---|---|
| `FTP_SERVER` | FTP host name of the webspace. |
| `FTP_USERNAME` | FTP user. |
| `FTP_PASSWORD` | FTP password. |
| `FTP_SERVER_DIR` | Folder of the subdomain on the webspace, ending in `/`, e.g. `playground/`. |
| `FIREBASE_SERVICE_ACCOUNT` | JSON key of a service account that may deploy rules (likely roles: **Firebase Rules Admin**, **Firebase Viewer** and **Service Usage Consumer**; the first deploy confirms them). |

## Updates

Dependabot (`.github/dependabot.yml`) checks weekly and opens grouped PRs:

| Group | Contents |
|---|---|
| `angular` | `@angular/*`, `@angular-devkit/*`, `@schematics/angular`, `angular-eslint`, `@angular-eslint/*`, `typescript` and `typescript-eslint`. |
| `firebase` | `firebase`, `firebase-tools` and `@firebase/*`. |
| `other` | Every other npm package. |
| `github-actions` | The actions used in `.github/workflows/` (pinned by commit SHA). Template only. |

A Project's Dependabot updates npm only. The workflows are Baseline files, so the Template's Dependabot bumps their actions and a Project gets the bumps when it merges the next Baseline release (see the [upgrade notes](upgrade-notes.md#github-actions-updates)).

A new version is only proposed once it is a few days old (npm: 3 days for patches, 7 for minors, 14 for majors; actions: 7), so a hijacked release is usually pulled before it reaches a PR. Security updates are not delayed.

The PR checks run on each one. Nothing merges automatically: merge a group by hand once its checks pass. If one fails, fix it on the Dependabot branch or in a separate PR.

Major upgrades of Angular, its tooling and TypeScript don't come from Dependabot (it ignores them), because they need Angular's migrations. Do them on a branch with `ng update`, following [the update guide](https://angular.dev/update-guide):

```bash
npx ng update @angular/core @angular/cli angular-eslint
```

Then run the checks locally (`npm run check` and `npm run test:integration`) and open a PR.

Template only: the migrations rewrite Baseline files, which in a Project fails the [Baseline drift check](syncing-baseline-releases.md#the-baseline-drift-check). A Project gets a major upgrade by merging the Baseline release that carries it, whose [upgrade notes](upgrade-notes.md) say what its Features must change.

## How this repo was planned

Planning was done in a conversation with Claude Code, using [Matt Pocock's agent skills](https://github.com/mattpocock/skills). Each step used one skill:

1. **Grill the idea**: [`/grill-with-docs`](https://aihero.dev/skills-grill-with-docs). It combines two skills:
   - [grilling](https://aihero.dev/skills-grilling): the agent asks numbered questions in rounds, each with a recommended answer. I accept or override each one, and the next round builds on the answers. This continues until every design decision is settled.
   - [domain-modeling](https://aihero.dev/skills-domain-modeling): while grilling, the agent records domain terms in a glossary. It writes an ADR for any decision that is hard to reverse, surprising, and the result of a real trade-off.
2. **Configure the skills**: [`/setup-matt-pocock-skills`](https://aihero.dev/skills-setup-matt-pocock-skills). This tells the other skills where issues live (local markdown files), which triage labels to use, and where the domain docs are.
3. **Write the spec**: [`/to-spec`](https://aihero.dev/skills-to-spec). The agent turns the conversation into a spec without asking anything new. The only check-in was agreeing the test seams.
4. **Break it into tickets**: [`/to-tickets`](https://aihero.dev/skills-to-tickets). The agent splits the spec into vertical "tracer bullet" slices, each with its blocking tickets. We iterated on size and dependencies, then published one file per ticket.

The tickets were then implemented in order with `/implement`, test-first with [`/tdd`](https://aihero.dev/skills-tdd) where possible.

## Docs

Paths are from the repo root. Files under `docs/project/` and the README are Project-owned; the Template ships a starting version of each. Every other file here is Baseline.

| File | Meaning |
|---|---|
| `README.md` | The front page: a short intro, how to create a Project, and links to this manual. Project-owned: a Project replaces it with its own. |
| `docs/baseline-manual.md` | This file: what the Baseline is, development, Features, setup, deploy and updates. |
| `docs/syncing-baseline-releases.md` | How a Project merges a Baseline release. |
| `CONTEXT-MAP.md` | The context map: points at the Baseline glossary and the Project glossary. |
| `CONTEXT.md` | The Baseline glossary (**Playground**, **Template**, **Baseline**, **Feature**, **Project**, **Baseline release** and more). Terms only, no implementation details. |
| `docs/project/CONTEXT.md` | The Project glossary: the Project's own domain terms. Empty in the Template. |
| `docs/project/adr/` | The Project's ADRs, numbered from 0001 on their own, apart from the Baseline ADRs in `docs/adr/`. Empty in the Template. |
| `docs/project/AGENTS.md` | Optional agent instructions for the Project, read on top of `AGENTS.md`. Empty in the Template. |
| `docs/adr/0001-native-firebase-sdk-instead-of-angularfire.md` | Why the native Firebase SDK is used instead of AngularFire: Angular updates shouldn't wait on a wrapper library. |
| `docs/adr/0002-ftp-deploy-instead-of-firebase-hosting.md` | Why the app is deployed by FTP to existing webspace, and what that means (static build, `.htaccess`, Google sign-in by popup only). |
| `docs/adr/0003-lazy-firestore-loader-token.md` | Why the `FIRESTORE` token gives a loader instead of an instance: the Firestore SDK stays out of the initial bundle. |
| `docs/adr/0004-testing-library-for-component-tests.md` | Why component tests use Testing Library and render the whole app through the router. |
| `docs/adr/0008-projects-keep-merging-baseline-releases.md` | Why Projects are cloned with history and keep merging `baseline-vX.Y.Z` releases, and why an npm library, submodules, runtime federation and a one-time copy were rejected. |
| `docs/upgrade-notes.md` | The four file groups, how Baseline releases are numbered and cut, and one entry per release saying what a Project must do. |
| `scripts/baseline-config.json` | The Feature, Project-owned and shared file patterns (everything else is Baseline), the `.scratch/` pattern the drift check ignores, and the Template's repository name. |
| `docs/agents/testing.md` | How component, integration and security-rules tests are written. |
| `docs/features.md` | How to add or remove a Feature, where Features live, and why a Feature's Firestore code stays behind its lazy route. |
| `AGENTS.md` | Entry point that tells AI agents how to use the skills in this repo. Links to `docs/project/AGENTS.md`. |
| `CODING_STANDARDS.md` | Code style rules that reviews check. They override the `angular-developer` skill where they disagree. |
| `docs/agents/issue-tracker.md` | Issues are local markdown files under `.scratch/<spec-slug>/`. |
| `docs/agents/triage-labels.md` | The triage labels, stored on each issue's `Status:` line. |
| `docs/agents/domain.md` | Where agents find both glossaries and both ADR folders, and how to use them. |
| `.scratch/baseline/spec.md` | The Baseline spec: problem, user stories, implementation and testing decisions, out of scope. |
| `.scratch/baseline/issues/01-…09-*.md` | Nine tickets in dependency order, each with acceptance criteria and its "Blocked by" tickets. |

## Skill sources

- Repository: [github.com/mattpocock/skills](https://github.com/mattpocock/skills)
- Skill descriptions: `https://aihero.dev/skills-<skill-name>`, e.g. [grilling](https://aihero.dev/skills-grilling), [domain-modeling](https://aihero.dev/skills-domain-modeling), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets)
- Installed here as the Claude Code plugin `mattpocock-skills` from the official plugin marketplace.
