# 06: PWA shell and update prompt

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The production build is an installable PWA whose app shell loads offline. When a new version is deployed, the end user sees a "new version available" prompt and chooses when to reload. The build output includes an Apache config so that deep links and reloads on any route work on the webspace, and so that caching never serves a stale app (ADR 0002).

**Blocked by:** 01 (Walking skeleton with PR checks)

**Status:** ready-for-agent

- [ ] `@angular/pwa` is added: a web manifest, icons and Angular's service worker, registered in production only
- [ ] The service-worker config caches the app shell and hashed assets
- [ ] An update prompt driven by Angular's service-worker update service. Reload happens only on user action. An unrecoverable service-worker state is handled with a reload notice
- [ ] The production build output contains an `.htaccess` with a fallback to `index.html` for unknown routes, no-cache for `index.html` and the service-worker files, and long-term caching for hashed assets
- [ ] Component tests (seam A) fake the update service and cover: no prompt by default, prompt shown on a ready version, and reload triggered only when the user confirms
- [ ] Manually verified with a local static server over the production build that the app is installable and the shell loads offline
