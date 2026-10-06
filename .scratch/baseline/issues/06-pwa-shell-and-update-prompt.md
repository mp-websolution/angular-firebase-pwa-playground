# 06: PWA shell and update prompt

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The production build is an installable PWA whose app shell loads offline. When a new version is deployed, the end user sees a "new version available" prompt and chooses when to reload. The build output includes an Apache config so that deep links and reloads on any route work on the webspace, and so that caching never serves a stale app (ADR 0002).

**Blocked by:** 01 (Walking skeleton with PR checks)

**Status:** ready-for-agent

- [x] `@angular/pwa` is added: a web manifest, icons and Angular's service worker, registered in production only
- [x] The service-worker config caches the app shell and hashed assets, and prefetches lazy chunks (including the Firestore SDK chunk) at install, so Firestore-backed pages and sign-out work offline on a later visit
- [x] An update prompt driven by Angular's service-worker update service. Reload happens only on user action. An unrecoverable service-worker state is handled with a reload notice
- [x] The production build output contains an `.htaccess` with a fallback to `index.html` for unknown routes, no-cache for `index.html` and the service-worker files, and long-term caching for hashed assets
- [x] Component tests (seam A) fake the update service and cover: no prompt by default, prompt shown on a ready version, and reload triggered only when the user confirms
- [x] Manually verified with a local static server over the production build that the app is installable and the shell loads offline

## Comments

### Implementation notes

- `ng add @angular/pwa` added `@angular/service-worker`, `ngsw-config.json`, `public/manifest.webmanifest` (named "Angular Firebase PWA Playground", short name "Playground", slate theme colour) and Angular's default icons in `public/icons/`. `provideServiceWorker` registers `ngsw-worker.js` only when not in dev mode, so `ng serve` never serves a stale build.
- `ngsw-config.json`: the `app` group prefetches `index.html`, the manifest, the favicon and every root `*.js` and `*.css`. All lazy chunks land in the build root, so the Firestore SDK chunk (~510 kB) and the profile page are cached at install. Icons are cached lazily. The `index.csr.html` entry from the schematic is gone: there is no SSR.
- `UpdatePrompt` (`src/app/pwa/update-prompt.ts`) sits beside the router outlet in `App`. On `VERSION_READY` it shows "A new version is available." with **Reload** and **Later**. Reload calls the existing `RELOAD_PAGE` token: the service worker serves the latest version to a fresh page, so no `activateUpdate()` is needed. Later hides the prompt until the next version is ready. On `unrecoverable` it shows an alert, "This version of the app stopped working. Reload to get the latest one.", with Reload only.
- The service worker checks for updates by itself only on page loads, so `UpdatePrompt` also calls `checkForUpdate()` when the app opens and whenever the tab becomes visible again (`visibilitychange`), which covers an installed app that stays open for days (decision after review, see below). A failed check (e.g. offline) is ignored; the next one retries.
- `public/.htaccess` is copied into the build root. Existing files are served as they are; other paths without a file extension fall back to `index.html`, while missing files with an extension (e.g. an old chunk) stay 404s, matching the service worker's navigation URLs. `index.html`, `ngsw.json`, the worker scripts and the manifest get `Cache-Control: no-cache`; `main|chunk|polyfills|styles-<hash>.js|css` and everything under `media/` get a one-year `immutable`. Lazy chunk hashes are mixed-case base64url (`chunk-D2O_9mdV.js`), which the pattern allows. Not run on Apache yet: the first deploy verifies it (spec).
- `@angular/service-worker` adds about 11 kB to the initial bundle: 461 kB in total, within the 500 kB budget.
- Component tests: `FakeSwUpdate` (`src/app/pwa/testing/`). `deployNewVersion()` puts a version on the "server" that the next `checkForUpdate()` finds; the `slowDownload` option holds `VERSION_READY` back until `finishDownload()`; `breakCurrentVersion()` emits an unrecoverable state. `renderApp` takes `swUpdate` and `reloadPage` options; by default no new version comes and reloading does nothing.
- Manually verified: a production build (with the placeholder Firebase config swapped for `demo-playground`, not committed) served by `python3 -m http.server` in headless Chrome over CDP. No installability errors (`Page.getInstallabilityErrors`), the service worker activates and caches all chunks, and with the server stopped `/` and `/profile` load from the service worker and render the sign-in page. Deploying a second build over the first showed the prompt after a reload, and clicking Reload switched to the new `main-*.js`. The desktop app's browser pane refuses service-worker registration, so it can't be used for this check.

### Decision after review: check on open and on return

- The user chose to check for a new version when the app opens and when the tab becomes visible again, rather than on a timer.
- The user asked for a test that the prompt waits for `VERSION_READY`: "waits until the new version is downloaded" uses `slowDownload`. A mutation that shows the prompt on `VERSION_DETECTED` fails it.
- Checked in headless Chrome: with v1 open, deploying v2 and firing `visibilitychange` fetched `ngsw.json`, showed the prompt, and Reload loaded v2. The page from the very first visit, loaded before the service worker existed, gets no prompt: the service worker only notifies pages it served. Every later visit is served by it.
