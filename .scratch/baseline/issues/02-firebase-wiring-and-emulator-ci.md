# 02: Firebase wiring, emulators and emulator CI job

**Spec:** `.scratch/baseline/spec.md`

**What to build:** The app initialises Firebase once through a single environment provider using the native modular SDK (ADR 0001). Auth, Firestore and Storage are exposed via injection tokens. In development the app connects to the Auth, Firestore and Storage emulators under the `demo-playground` project, and one command starts the app and the emulators together, with the Emulator UI. An integration-test suite (seam B) runs inside the emulators, both locally and as its own CI job. It is proven here with a minimal test that the injected instances really talk to the emulators. There is no user-visible feature yet; the verifiable outcome is green emulator integration tests in CI.

**Blocked by:** 01 (Walking skeleton with PR checks)

**Status:** ready-for-agent

- [ ] The `firebase` package is the only Firebase dependency. There is no `@angular/fire`
- [ ] One environment provider initialises the app and exposes Auth, Firestore and Storage through injection tokens
- [ ] Firestore is initialised with persistent local cache (multi-tab)
- [ ] The development environment connects to the emulators. The production environment never does, and it contains a placeholder for the production web config
- [ ] The Firebase project config declares the Auth, Firestore, Storage and UI emulators, and a default project alias of `demo-playground`
- [ ] Starter Firestore and Storage rules files exist and deny everything by default
- [ ] One npm script starts the emulators and the dev server together
- [ ] A separate npm script runs the integration suite inside `firebase emulators:exec`, kept apart from the component tests
- [ ] At least one integration test proves each injected instance reaches its emulator
- [ ] The PR workflow gains a job that sets up Java 21 and runs the integration suite
- [ ] A seed-script mechanism exists that populates the emulators on local start. Real seed content arrives in later tickets
