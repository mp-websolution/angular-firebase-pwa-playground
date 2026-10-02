# 02: Firebase wiring, emulators and emulator CI job

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The app initialises Firebase once through a single environment provider using the native modular SDK (ADR 0001). Auth, Firestore and Storage are exposed via injection tokens. In development the app connects to the Auth, Firestore and Storage emulators under the `demo-playground` project, and one command starts the app and the emulators together, with the Emulator UI. An integration-test suite (seam B) runs inside the emulators, both locally and as its own CI job. It is proven here with a minimal test that the injected instances really talk to the emulators. There is no user-visible feature yet; the verifiable outcome is green emulator integration tests in CI.

**Blocked by:** 01 (Walking skeleton with PR checks)

**Status:** ready-for-agent

- [x] The `firebase` package is the only Firebase dependency. There is no `@angular/fire`
- [x] `firebase-tools` is a devDependency pinned to an exact version (no `^` or `~`). Every npm script and the CI job call this local copy (e.g. via `npx firebase`), never a global install
- [x] One environment provider initialises the app and exposes Auth, Firestore and Storage through injection tokens
- [x] Firestore loads lazily (ADR 0003): the `FIRESTORE` token provides a loader (`() => Promise<Firestore>`), nothing eagerly loaded imports values from `firebase/firestore`, and the initial bundle budget is back at 500 kB warning / 1 MB error
- [x] Firestore is initialised with persistent local cache (multi-tab) by default. The provider accepts an option to use the memory cache instead, and the integration suite uses it, because jsdom has no IndexedDB. Only the sign-out test uses the persistent cache, on `fake-indexeddb`, because it must prove the on-disk cache is deleted
- [x] `signOutAndClearCache(auth, loadFirestore)` terminates Firestore, deletes its on-disk cache and signs out, so ticket 03's sign-out can rely on it
- [x] The development environment connects to the emulators. The production environment never does, and it contains a placeholder for the production web config
- [x] The Firebase project config declares the Auth, Firestore, Storage and UI emulators, and a default project alias of `demo-playground`
- [x] Starter Firestore and Storage rules files exist and deny everything by default
- [x] One npm script starts the emulators and the dev server together
- [x] The integration suite is a second configuration of Angular's unit-test builder (e.g. `ng test --configuration=integration`) with its own `include` pattern, so it shares the builder's compilation and follows Angular upgrades. It is not a standalone `vitest` setup
- [x] A separate npm script runs that configuration inside `firebase emulators:exec`. The default `npm test` excludes integration tests, and the integration configuration excludes component tests
- [x] At least one integration test proves each injected instance reaches its emulator
- [x] The PR workflow gains a job that sets up Java 21 and runs the integration suite
- [x] A seed-script mechanism exists that populates the emulators on local start. Real seed content arrives in later tickets
