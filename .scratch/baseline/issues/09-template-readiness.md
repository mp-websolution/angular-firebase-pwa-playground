# 09: Template readiness: Dependabot and setup README

**Spec:** `.scratch/baseline/spec.md`

**What to build:** Someone who creates a new project from the Playground template can take it from zero to live by following the README alone. Dependency updates arrive as grouped Dependabot pull requests that CI checks and a human merges.

**Blocked by:** 08 (Deploy pipeline)

**Status:** ready-for-agent

- [x] Dependabot config: npm updates grouped as all `@angular/*` (plus Angular tooling) together, `firebase` and `firebase-tools` together, and the rest grouped. GitHub Actions updates are enabled. No auto-merge
- [x] The README explains what the Playground is (Baseline and Prototypes, using `CONTEXT.md` terms) and links the ADRs
- [x] The README covers local development: prerequisites (Node 24, Java 21, Firebase CLI), start, seed, component tests and integration tests
- [x] The README covers adding and removing a Prototype
- [x] The README lists every manual setup step:
  - Create the Firebase project, with Firestore and Storage in `europe-west3`
  - Enable email/password and Google auth, and add the production domain to authorised domains
  - Put the web config in the production environment
  - Create a service account with the needed roles and store its key. The README's Deploy section (ticket 08) guesses Firebase Rules Admin, Firebase Viewer and Service Usage Consumer; confirm them once the first deploy has run
  - Create the GitHub `production` environment and its secrets (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`, `FIREBASE_SERVICE_ACCOUNT`), with deployment branches restricted to `main`. Manual tag deploys run the Deploy workflow from `main` with the tag as input
  - Create rulesets: `main` and `release/*` require a PR and the passing checks `checks / lint-test-build` and `checks / integration` with no bypass, including admins; `v*` tag creation is restricted to the owner
  - Set up the webspace subdomain and folder
  - Mark the repo as a template
- [x] The README's setup steps build on the "Deploy" section ticket 08 added (web config, `production` environment and secrets), rather than duplicating it
- [x] The README documents the update workflow: grouped Dependabot PRs are merged by hand, and major Angular upgrades are done with `ng update`
- [x] App icons: Angular's placeholder icons are replaced with the project's own, and the manifest stops declaring `"purpose": "maskable any"`. The existing sizes become `any` icons, plus separate `maskable` icons (at least 192 and 512 px) with an opaque background and the artwork inside the central safe zone, made with a tool like maskable.app or pwa-asset-generator. Chrome DevTools (Application → Manifest) shows no icon warnings. The README tells template users how to swap in their own icons

## Comments

### Implementation notes

- `.github/dependabot.yml`: weekly npm and GitHub Actions updates. npm groups `angular` (`@angular/*`, `@angular-devkit/*`, `@schematics/angular`, `angular-eslint`, `@angular-eslint/*`, `typescript`, whose range the Angular compiler pins, and `typescript-eslint`, which must support that TypeScript), `firebase` (`firebase`, `firebase-tools`, `@firebase/*` for `@firebase/rules-unit-testing`) and `other`; all actions in one `github-actions` group. Semver-major updates of the Angular packages and TypeScript are ignored, since the README sends those through `ng update`. No auto-merge anywhere.
- README rewritten around the template user: what the Playground is (CONTEXT.md terms, ADR links), development (prerequisites, commands), Prototypes (short, links `docs/prototypes.md`), app icons, a numbered "Setup: from zero to live" (repo/template flag, Firebase project in `europe-west3`, Auth providers and authorised domain, web config, service account, webspace, `production` environment, rulesets, first deploy), the Deploy section from ticket 08 (unchanged; setup steps 4, 5 and 7 link to it instead of repeating it) and Updates. The planning history stays at the end.
- Rulesets as documented: one branch ruleset for the default branch and `release/*` (PR with 0 approvals so a solo owner can merge, both `checks / …` status checks, no deletions or force pushes, empty bypass list); one tag ruleset for `v*` restricting creation, update and deletion, with only Repository admin (the owner on a personal repo) as bypass. Restricting tag updates/deletions goes beyond the ticket: moving a release tag would redeploy different code under the same name.
- Storage: the README notes that new Storage buckets need the Blaze plan (Firebase's rule for default buckets since late 2024).
- Icons: new artwork (three blocks on slate-900, the theme colour) as two SVGs in `scripts/icons/`; `npm run icons` (`scripts/icons/generate.mjs`) renders them with headless Chrome into the eight existing sizes as `purpose: any`, two opaque `icon-maskable-{192,512}` with the artwork scaled to 80% (corners at ~145 px from centre, inside the 205 px safe-zone radius), and a 16/32/48 `favicon.ico` (PNG-in-ICO, written without extra dependencies). No `maskable any` left in the manifest.
- Verified the manifest through Chrome's own parser (CDP `Page.getAppManifest` and `Page.getInstallabilityErrors` against the served production build): no errors, purposes parsed as 8 × `any` + 2 × `maskable`, no installability errors. Not checked by eye in the DevTools panel.
- Not done (manual, for a human): marking the repo as a template, the rulesets, the Firebase project and the first deploy. The service-account roles are still the ticket 08 guess until that deploy.
