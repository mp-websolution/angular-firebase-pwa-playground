# Spec 0001: Playground Baseline

Status: ready-for-agent

## Problem Statement

I build PWAs with Angular and Firebase. Every time a new Angular or Firebase version ships, I have no low-risk place to try the update, and every new PWA project starts by rebuilding the same shell again: auth, Firebase wiring, offline support, tests, CI and deployment. The usual shortcut, AngularFire, often lags behind new Angular major versions, which blocks exactly the quick updates I want to practise. My frontend has to live on webspace I already pay for (together with the domain and email) and is reachable only over plain FTP, so Firebase Hosting's conveniences are not available.

## Solution

A **Playground**: a private GitHub template repository containing a **Baseline** and one example **Prototype**.

- The Baseline is a zoneless Angular 22 PWA. It includes email/password and Google sign-in, a protected home page and a profile page (display name in Firestore, avatar in Storage).
- It talks to Firebase through the native modular SDK. There is no AngularFire.
- Offline use comes from Angular's service worker plus Firestore's local persistence, and a prompt appears when a new version is available.
- All local development and CI run against the Firebase emulators using a `demo-*` project, seeded with demo data. No real Firebase project is needed to work on the code.
- Tests use Vitest with Testing Library. Component tests fake the data-access services. A separate integration suite, including security-rules tests, runs against the emulators.
- GitHub Actions checks every pull request and deploys on every merge to `main`, or manually for any release tag. The frontend goes over FTP to the existing webspace, and Firestore/Storage rules and indexes go to the production Firebase project in the same run.
- Dependabot proposes grouped updates. A human merges everything. Branch and tag rulesets enforce that for everyone, admins included.
- Future projects start from the template. A Prototype can be copied out or deleted without touching the Baseline.

## User Stories

### Developer: local development

1. As a developer, I want to start the whole app plus Firebase emulators with one command, so that I can work without any cloud project or credentials.
2. As a developer, I want the emulators to be seeded automatically with a demo user and sample documents, so that I land in a usable app instead of an empty one.
3. As a developer, I want the seed data defined in a readable, committed script, so that it is reviewable and evolves with the data model.
4. As a developer, I want the app to connect to the emulators automatically in development and never in production, so that I cannot accidentally write to production data locally.
5. As a developer, I want the emulators to use a `demo-*` project ID, so that a misconfiguration cannot reach real Firebase resources.
6. As a developer, I want to see the Emulator UI while developing, so that I can inspect auth users, documents and files.
7. As a developer, I want the Node version pinned in the repo, so that local and CI environments match.
8. As a developer, I want lint and formatting (angular-eslint, Prettier) available as npm scripts, so that the code style stays consistent without thought.
9. As a developer, I want styling done with Tailwind v4 on plain CSS, so that I avoid preprocessor incompatibilities and can prototype UI quickly.

### Developer: Firebase integration

10. As a developer, I want Firebase initialised once through a single Angular environment provider, so that the wiring lives in exactly one place.
11. As a developer, I want Auth, Firestore and Storage instances available through injection tokens, so that services get them via DI rather than global imports.
12. As a developer, I want the app to depend on the native `firebase` package only, so that Angular updates never wait for a wrapper library.
13. As a developer, I want feature services to expose state as signals, so that components stay zoneless and simple.
14. As a developer, I want Firebase realtime callbacks turned into signals inside the data-access services, so that components never deal with SDK listeners or unsubscribe logic.
15. As a developer, I want the production Firebase web config committed alongside the production environment, so that builds need no extra secrets for it.
16. As a developer, I want Firestore offline persistence enabled, so that data stays available when offline.

### End user: authentication

17. As an end user, I want to sign up with email and password, so that I can use the app without a Google account.
18. As an end user, I want to sign in with email and password, so that I can return to my data.
19. As an end user, I want to sign in with Google in a popup, so that I can log in with one click on the app's custom domain.
20. As an end user, I want to see a clear error message when sign-in fails, so that I know whether to retry or fix my input.
21. As an end user, I want to sign out, so that others using my device cannot access my data.
22. As an end user, I want to stay signed in across reloads, so that I don't have to log in every visit.
23. As an end user, I want to be redirected to sign-in when I open a protected page while signed out, so that I understand why I can't see it.
24. As an end user, I want to return to the page I originally requested after signing in, so that deep links keep working.
25. As an end user, I want signed-in users sent away from the sign-in page, so that I don't see a pointless login form.

### End user: profile

26. As an end user, I want to see my profile with display name and avatar, so that I know which account I'm using.
27. As an end user, I want to edit my display name, so that the app shows the name I prefer.
28. As an end user, I want to upload an avatar image, so that my profile is recognisable.
29. As an end user, I want to be told when an avatar is too large or not an image, so that I understand a rejected upload.
30. As an end user, I want my profile edits to work while offline and sync later, so that flaky connections don't lose my changes.
31. As an end user, I want to be unable to read or change other users' profiles or avatars, so that my data stays private.

### End user: PWA behaviour

32. As an end user, I want to install the app to my home screen or desktop, so that it feels like a native app.
33. As an end user, I want the app shell to load offline, so that I can open it without a connection.
34. As an end user, I want to be told when a new version is available and reload on my own terms, so that updates don't interrupt me mid-task.
35. As an end user, I want deep links and page reloads on any route to work on the hosted site, so that bookmarks and shared links never 404.

### Developer: Prototypes

36. As a developer, I want one example Prototype ("notes") that shows the full pattern (lazy route, data-access service, rules, tests), so that I have a reference to copy.
37. As a developer, I want each Prototype to be a lazy-loaded route area, so that it doesn't affect the Baseline's bundle or startup.
38. As a developer, I want each Prototype to own its data-access service, security rules section, seed data and tests, so that it is self-contained.
39. As a developer, I want to delete a Prototype without changing the Baseline, so that experiments are cheap to discard.
40. As a developer, I want to copy a Prototype into a future project that started from the template, so that proven experiments carry over.
41. As an end user of the notes Prototype, I want to create, list, edit and delete my own notes, so that the Prototype exercises realtime Firestore CRUD.
42. As an end user of the notes Prototype, I want to see only my own notes, so that the rules pattern for per-user data is demonstrated.

### Developer: testing

43. As a developer, I want component tests that render pages through the router with Testing Library, so that tests exercise what a user sees and does.
44. As a developer, I want component tests to replace data-access services with in-memory fakes via DI, so that they run fast without emulators or Java.
45. As a developer, I want the service-worker update prompt tested by faking Angular's update service, so that the update flow is covered without a real service worker.
46. As a developer, I want an integration suite that runs the real data-access services against the emulators, so that SDK usage and queries are verified for real.
47. As a developer, I want security-rules tests for every Baseline collection, the avatar storage path and each Prototype, so that access control can't silently regress.
48. As a developer, I want the integration suite to start and stop the emulators itself, so that one command runs it locally and in CI.
49. As a developer, I want Vitest via Angular's official unit-test builder, so that the test setup follows Angular upgrades instead of fighting them.

### Developer: CI/CD and repository governance

50. As a developer, I want every pull request to run lint, component tests, emulator integration tests and a production build, so that nothing broken reaches `main`.
51. As a developer, I want direct pushes to `main` and `release/*` blocked for everyone, including me, so that all changes go through a checked pull request.
52. As a developer, I want merges done only by a human after checks pass, so that I stay in control of what ships.
53. As a developer, I want a merge to `main` to deploy automatically to production, so that the live Playground always reflects `main`.
54. As a developer, I want to deploy any `vX.Y.Z` tag manually, so that I can ship from a release branch or roll back.
55. As a developer, I want only myself to be able to create `v*` tags, so that no bot or workflow can create a deployable ref.
56. As a developer, I want the frontend and the Firestore/Storage rules and indexes deployed together from the same commit, so that the client and rules never drift.
57. As a developer, I want the FTP upload to transfer only changed files, so that deploys are fast on shared hosting.
58. As a developer, I want FTP credentials and the Firebase service-account key stored as secrets of a `production` environment, so that they are scoped to deploy jobs only.
59. As a developer, I want the build to include server config for SPA fallback and correct caching (never cache `index.html` or the service-worker manifest, cache hashed assets long-term), so that updates reach users reliably.
60. As a developer, I want Dependabot to open grouped PRs (all `@angular/*` together, `firebase` separately, the rest grouped sensibly), so that updates arrive in coherent, testable batches.
61. As a developer, I want Dependabot to also update GitHub Actions versions, so that the pipeline itself stays current.
62. As a developer, I want major Angular upgrades done manually with `ng update`, so that official migrations run.

### Developer: template and onboarding

63. As a developer, I want the repo marked as a GitHub template, so that each future PWA project starts from it with one click.
64. As a developer, I want the README to list every manual setup step: Firebase project creation in `europe-west3`, enabling Auth providers, authorised domains, service account, GitHub secrets and environment, rulesets, and the FTP subdomain folder. That way a new project from the template can be made live without guesswork.
65. As a developer, I want a domain glossary and ADRs in the repo, so that future readers understand the vocabulary and the non-obvious choices.

## Implementation Decisions

### Architecture and vocabulary

- The terms Playground, Baseline and Prototype are used as defined in the domain glossary.
- ADR 0001: native Firebase SDK instead of AngularFire.
- ADR 0002: FTP deploy to existing webspace instead of Firebase Hosting, with Google sign-in via popup only.
- Angular 22, standalone, zoneless, signals-first. The npm package manager. No SSR and no prerendering: the build is a purely static client.
- Styling is Tailwind v4 on plain CSS. SCSS is not used anywhere.

### Firebase integration module

- One environment provider initialises the Firebase app from environment config. It exposes Auth, Firestore and Storage through injection tokens, and in development it connects each of them to its emulator.
- Firestore is initialised with persistent local cache (multi-tab).
- Components never import from the Firebase SDK. Only data-access services do.

### Data-access services (the test seam)

Each service is injectable, exposes read state as signals, exposes commands as promise-returning methods, and hides every SDK detail:

- **Auth session service.** State: current user (or none) and "auth resolved" status. Commands: sign up and sign in with email/password, sign in with Google (popup), sign out.
- **Profile service.** State: the current user's profile (display name, avatar URL). Commands: update display name, upload avatar.
- **Notes service** (example Prototype). State: the current user's notes, updated in realtime. Commands: create, update, delete.

A Prototype adds its own service following the same shape. Route guards depend only on the auth session service.

### Data model

- Profiles are one document per user in a profiles collection, keyed by user ID. The user has read and write access to their own document only.
- Avatars are stored at a per-user storage path. Only the owner can write. The rules limit uploads by size and require an image content type.
- Notes are stored per user (either in a per-user subcollection or with an owner field enforced by rules). Access is owner-only.
- The rules are split so that each Prototype's section is identifiable and removable.

### Routing and UI

- Public sign-in route. Protected home and profile routes. The notes Prototype is a lazy-loaded route area under its own path.
- A "redirect after login" preserves the originally requested URL.
- The PWA uses Angular's service worker. The update prompt is driven by Angular's service-worker update service, and the user chooses when to reload.

### Environments

- Development and CI use the Firebase project ID `demo-playground` and the emulators (Auth, Firestore, Storage, UI).
- Production uses one real Firebase project with Firestore in `europe-west3`. Its web config is committed.
- A seed script populates the emulators on local start with a demo user, a profile and sample notes.

### Hosting

- The site is served from the root of a dedicated subdomain, from its own folder on the webspace.
- The build output includes an Apache `.htaccess` for the SPA fallback to `index.html`, no-cache on `index.html` and the service-worker files, and long-term caching of hashed assets.

### CI/CD

- **PR workflow:** install, lint, component tests, emulator integration tests (Java set up in CI), production build.
- **Deploy workflow:** triggered by a push to `main` (only reachable via merge) and by `workflow_dispatch` with a `vX.Y.Z` tag as input. Runs the same checks, then uploads over FTP with `SamKirkland/FTP-Deploy-Action` (plain FTP, state-file sync), then `firebase deploy --only firestore,storage` using a service-account key. Both use secrets of the `production` environment.
- **Rulesets:** `main` and `release/*` require a PR and passing checks and forbid direct pushes and bypass, admins included. Creating `v*` tags is restricted to the owner.
- **Dependabot:** npm updates grouped (`@angular/*`, `firebase`, others) plus GitHub Actions updates. No auto-merge.

## Testing Decisions

- **What a good test is:** it exercises externally visible behaviour, meaning what the user sees and does, or what a service's public interface returns. It never inspects internals, private state or SDK calls. Tests should survive refactors that don't change behaviour.
- **Seam A, component tests** (Vitest via Angular's official unit-test builder, `@testing-library/angular`):
  - Pages are rendered through the router and interacted with by role and label.
  - Data-access services are replaced by in-memory fakes through DI, and the service-worker update service is faked the same way.
  - These tests cover sign-in and sign-up forms and their errors, guard redirects including the return URL, profile editing and avatar validation messages, notes CRUD, and the update prompt.
- **Seam B, integration tests** (Vitest against the emulators, run inside `firebase emulators:exec`):
  - The real data-access services run against `demo-playground`. This covers auth flows (email/password), profile read and write, avatar upload, and notes realtime updates.
  - Security rules are tested with `@firebase/rules-unit-testing`: owner access allowed and cross-user access denied for profiles, avatars and notes, plus the avatar size and type limits.
- **Not tested automatically:** the Google popup flow (verified manually), FTP deploy and `.htaccess` behaviour (verified by the first deploy), and installability (checked in the browser).
- **Prior art:** none. This is a greenfield repo. The notes Prototype's tests become the prior art future Prototypes copy.

## Out of Scope

- Cloud Functions, FCM push notifications, App Check, Remote Config, Analytics.
- SSR and prerendering. Firebase Hosting, including its preview channels.
- Browser end-to-end tests (Playwright). These may come later as an addition.
- A staging Firebase project or staging webspace. Tag deploys go to production.
- Keyless (Workload Identity Federation) auth for CI. A service-account key is used.
- FTPS and SFTP: the webspace plan offers no SFTP, and plain FTP was chosen knowingly.
- Automated scripts for the manual setup steps. The README lists them instead.
- Auto-merging dependency updates.
- A UI component library (Angular Material or similar).

## Further Notes

- Versions at time of writing: Angular 22.2, `firebase` 12.19, `@testing-library/angular` 19.5 (peer dependency `@angular/core >= 21`), Tailwind 4.3, `firebase-tools` 15.32, Node 24, Java 21.
- The emulators need Java 21 or newer, locally and in CI.
- The production domain must be added to Firebase Auth's authorised domains, or Google sign-in fails.
- The glossary and ADRs 0001 and 0002 already exist in the repo and should be kept current as Prototypes are added.
