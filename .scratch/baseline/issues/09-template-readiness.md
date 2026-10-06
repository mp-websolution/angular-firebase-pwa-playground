# 09: Template readiness: Dependabot and setup README

**Spec:** `.scratch/baseline/spec.md`

**What to build:** Someone who creates a new project from the Playground template can take it from zero to live by following the README alone. Dependency updates arrive as grouped Dependabot pull requests that CI checks and a human merges.

**Blocked by:** 08 (Deploy pipeline)

**Status:** ready-for-agent

- [ ] Dependabot config: npm updates grouped as all `@angular/*` (plus Angular tooling) together, `firebase` and `firebase-tools` together, and the rest grouped. GitHub Actions updates are enabled. No auto-merge
- [ ] The README explains what the Playground is (Baseline and Prototypes, using `CONTEXT.md` terms) and links the ADRs
- [ ] The README covers local development: prerequisites (Node 24, Java 21, Firebase CLI), start, seed, component tests and integration tests
- [ ] The README covers adding and removing a Prototype
- [ ] The README lists every manual setup step:
  - Create the Firebase project, with Firestore and Storage in `europe-west3`
  - Enable email/password and Google auth, and add the production domain to authorised domains
  - Put the web config in the production environment
  - Create a service account with the needed roles and store its key
  - Create the GitHub `production` environment and its secrets
  - Create rulesets: `main` and `release/*` require a PR and passing checks with no bypass, including admins; `v*` tag creation is restricted to the owner
  - Set up the webspace subdomain and folder
  - Mark the repo as a template
- [ ] The README documents the update workflow: grouped Dependabot PRs are merged by hand, and major Angular upgrades are done with `ng update`
- [ ] App icons: Angular's placeholder icons are replaced with the project's own, and the manifest stops declaring `"purpose": "maskable any"`. The existing sizes become `any` icons, plus separate `maskable` icons (at least 192 and 512 px) with an opaque background and the artwork inside the central safe zone, made with a tool like maskable.app or pwa-asset-generator. Chrome DevTools (Application → Manifest) shows no icon warnings. The README tells template users how to swap in their own icons
