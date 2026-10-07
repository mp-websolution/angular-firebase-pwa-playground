# Angular Firebase PWA Playground

A template repo for trying out Angular and Firebase updates and prototyping future PWA projects. The stack is Angular, the native Firebase SDK, Firebase emulators, Testing Library, GitHub Actions and FTP deploy.

## What this is

The repo is a **Playground** (terms from `CONTEXT.md`): the **Baseline** plus any **Prototypes**.

- The **Baseline** is the minimal shell every future project inherits: sign-in (email/password and Google), the user profile with avatar, Firebase wiring, PWA behaviour (offline shell, update prompt), tests, CI and the deploy pipeline. It never depends on a Prototype.
- A **Prototype** is a self-contained, disposable feature beside the Baseline. The notes page (`/notes`) is the example. Deleting a Prototype leaves the Baseline intact.
- As the **Template**, the repo is the starting point of a new project: "Use this template" on GitHub, then follow [Setup](#setup-from-zero-to-live). Changes don't flow back.

The non-obvious choices are recorded as ADRs:

- [0001: Native Firebase SDK instead of AngularFire](docs/adr/0001-native-firebase-sdk-instead-of-angularfire.md)
- [0002: FTP deploy instead of Firebase Hosting](docs/adr/0002-ftp-deploy-instead-of-firebase-hosting.md)
- [0003: Lazy Firestore loader token](docs/adr/0003-lazy-firestore-loader-token.md)
- [0004: Testing Library for component tests](docs/adr/0004-testing-library-for-component-tests.md)

## Project Setup
  run `npx skills install` to add skills referenced in `skills-lock.json`

## Development

Prerequisites:

- Node 24 (`.nvmrc`), e.g. `nvm use`.
- Java 21+, for the Firebase emulators.
- Firebase CLI: comes with `npm ci` as the `firebase-tools` dev dependency, used by the npm scripts and as `npx firebase`. No global install or login is needed.

No Firebase project or credentials are needed: development runs against the `demo-playground` emulators.

| Command | What it does |
|---|---|
| `npm start` | Starts the Auth, Firestore and Storage emulators with the Emulator UI (http://localhost:4000), seeds them, then serves the app (http://localhost:4200). |
| `npm run seed` | Runs every seeder in `scripts/seed/`. Only works inside the emulators; `npm start` calls it. |
| `npm test` | Component tests. No emulators needed. |
| `npm run test:integration` | Integration tests (`*.integration.spec.ts`), including the security-rules tests, inside the emulators. |
| `npm run lint` / `npm run format` | ESLint / Prettier. CI also runs `npm run format:check`. |
| `npm run build` | Production build into `dist/browser/`. |
| `npm run icons` | Renders the app icons from `scripts/icons/` (see [App icons](#app-icons)). |

After `npm start`, sign in as the seeded demo user `demo@example.com` with password `demo-password` (see `scripts/seed/01-demo-user.mjs`; its profile comes from `02-demo-profile.mjs`), create an account, or use "Sign in with Google": the Auth emulator opens a popup where you pick or add a fake Google account.

How tests are written is in `docs/agents/testing.md`.

Production builds are a PWA: Angular's service worker (configured in `ngsw-config.json`) is registered only there, never under `ng serve`. `public/.htaccess` ships with the build and gives Apache the SPA fallback to `index.html` and the cache headers.

Production builds need the production project's web config in `src/environments/environment.ts`. While it still holds the `REPLACE_ME` placeholder, the app throws at startup instead of failing later on its first Firebase call.

## Prototypes

`docs/prototypes.md` has the full steps and explains why a Prototype's Firestore code stays behind its lazy route. In short, a Prototype owns four things, all modelled on the notes Prototype:

1. Its route entry in `src/app/prototypes.routes.ts` (home links to it by its title).
2. Its folder, e.g. `src/app/notes/`.
3. Its delimited section in `firestore.rules` (and `storage.rules` if needed).
4. Its seeder, e.g. `scripts/seed/prototype-notes.mjs`.

**Add** one by copying those four from the notes Prototype and renaming. **Remove** one by deleting them, then run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`.

## App icons

The icons are rendered from two SVGs by `npm run icons` (needs Google Chrome; set `CHROME` to its path if it isn't `google-chrome` on the `PATH`):

- `scripts/icons/icon.svg`: the `any` icons (`public/icons/icon-<size>.png`) and `public/favicon.ico`. Its shape is what users see, so it may have transparent corners.
- `scripts/icons/icon-maskable.svg`: the `maskable` icons (`public/icons/icon-maskable-<size>.png`). The platform crops these to its own shape, so the background must be opaque and fill the square, with the artwork inside the central safe zone (a circle with 40% of the icon's width as radius).

To use your own icons, replace both SVGs (keep the 512 × 512 `viewBox`) and run `npm run icons`. Check the maskable one at [maskable.app](https://maskable.app). If you'd rather make the PNGs elsewhere, e.g. with [pwa-asset-generator](https://github.com/elegantapp/pwa-asset-generator), keep the file names and sizes that `public/manifest.webmanifest` lists. Update `theme_color` and `background_color` there too, and the `theme-color` meta tag in `src/index.html`. Chrome DevTools → Application → Manifest should show no icon warnings.

## Setup: from zero to live

Every manual step a new project needs, in order. None of them are scripted.

### 1. Repository

- **The Playground only:** Settings → General → tick **Template repository**. A project created from it doesn't need this.
- **A new project:** "Use this template" → create the repo, clone it, then run `npm ci` and `npm start` to check that it works locally.

### 2. Firebase project

In the [Firebase console](https://console.firebase.google.com):

1. Create a project. Google Analytics isn't used.
2. **Firestore Database** → Create database, location `europe-west3` (Frankfurt), production mode. The deploy replaces its rules with `firestore.rules`.
3. **Storage** → Get started, location `europe-west3`. New Storage buckets need the pay-as-you-go Blaze plan; set a budget alert in Google Cloud billing. The deploy replaces its rules with `storage.rules`.
4. Project settings → Your apps → add a **Web app** (no Firebase Hosting). Its config object is the web config for step 4 below.

The location of Firestore and Storage can't be changed later.

### 3. Authentication

1. **Authentication** → Sign-in method: enable **Email/Password** and **Google**.
2. **Authentication** → Settings → **Authorised domains**: add the production domain, e.g. `playground.example.com`. Without it Google sign-in fails there. (`localhost` is already listed.)

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
   - Rules: **Restrict deletions**, **Block force pushes**, **Require a pull request before merging** (0 required approvals, so a solo owner can merge), and **Require status checks to pass** with `checks / lint-test-build` and `checks / integration`. The checks are only offered once they have run in a PR, so open one first if the list is empty.
2. **Tags:** New tag ruleset, e.g. `release tags`.
   - Enforcement status: **Active**. Target tags: the pattern `v*`.
   - Rules: **Restrict creations**, **Restrict updates** and **Restrict deletions**.
   - Bypass list: **Repository admin** only. On a personal repo that is the owner, so only the owner can create release tags.

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
| `angular` | `@angular/*` and the tooling that moves with it: `angular-eslint`, `typescript`. |
| `firebase` | `firebase`, `firebase-tools` and `@firebase/*`. |
| `other` | Every other npm package. |
| `github-actions` | The actions used in `.github/workflows/` (pinned by commit SHA). |

The PR checks run on each one. Nothing merges automatically: merge a group by hand once its checks pass. If one fails, fix it on the Dependabot branch or in a separate PR.

Major Angular upgrades don't come from Dependabot (it ignores them), because they need Angular's migrations. Do them on a branch with `ng update`, following [the update guide](https://angular.dev/update-guide):

```bash
npx ng update @angular/core @angular/cli angular-eslint
```

Then run the checks locally (`npm run lint`, `npm test`, `npm run test:integration`, `npm run build`) and open a PR.

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

| File | Meaning |
|---|---|
| `README.md` | This file: what the Playground is, development, setup, deploy and updates. |
| `CONTEXT.md` | Domain glossary (**Playground**, **Template**, **Baseline**, **Prototype**). Terms only, no implementation details. |
| `docs/adr/0001-native-firebase-sdk-instead-of-angularfire.md` | Why the native Firebase SDK is used instead of AngularFire: Angular updates shouldn't wait on a wrapper library. |
| `docs/adr/0002-ftp-deploy-instead-of-firebase-hosting.md` | Why the app is deployed by FTP to existing webspace, and what that means (static build, `.htaccess`, Google sign-in by popup only). |
| `docs/adr/0003-lazy-firestore-loader-token.md` | Why the `FIRESTORE` token gives a loader instead of an instance: the Firestore SDK stays out of the initial bundle. |
| `docs/adr/0004-testing-library-for-component-tests.md` | Why component tests use Testing Library and render the whole app through the router. |
| `docs/agents/testing.md` | How component, integration and security-rules tests are written. |
| `docs/prototypes.md` | How to add or remove a Prototype, and why its Firestore code stays behind its lazy route. |
| `AGENTS.md` | Entry point that tells AI agents how to use the skills in this repo. |
| `docs/agents/issue-tracker.md` | Issues are local markdown files under `.scratch/<feature>/`. |
| `docs/agents/triage-labels.md` | The triage labels, stored on each issue's `Status:` line. |
| `docs/agents/domain.md` | Where agents find the glossary and ADRs, and how to use them. |
| `.scratch/baseline/spec.md` | The Baseline spec: problem, user stories, implementation and testing decisions, out of scope. |
| `.scratch/baseline/issues/01-…09-*.md` | Nine tickets in dependency order, each with acceptance criteria and its "Blocked by" tickets. |

## Skill sources

- Repository: [github.com/mattpocock/skills](https://github.com/mattpocock/skills)
- Skill descriptions: `https://aihero.dev/skills-<skill-name>`, e.g. [grilling](https://aihero.dev/skills-grilling), [domain-modeling](https://aihero.dev/skills-domain-modeling), [to-spec](https://aihero.dev/skills-to-spec), [to-tickets](https://aihero.dev/skills-to-tickets)
- Installed here as the Claude Code plugin `mattpocock-skills` from the official plugin marketplace.
