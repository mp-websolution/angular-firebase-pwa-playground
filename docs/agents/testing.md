# Testing

How tests are written here (ADR 0004). For component tests this guide replaces the `angular-developer` skill's `testing-fundamentals.md`, `component-harnesses.md` and `router-testing.md`.

## Component tests

A component test renders the whole app through the router and drives it the way a user would.

- **Render** with `renderApp(url, { session?, profile?, swUpdate?, reloadPage?, extraRoutes?, providers? })` from `src/app/testing/render-app.ts`. It renders `App` with the real routes at `url`, with every data-access service faked, Angular's `SwUpdate` faked by `FakeSwUpdate` from `src/app/pwa/testing/`, and page reloads replaced by `reloadPage` (a no-op by default). A page that doesn't exist yet goes in `extraRoutes`.
- **Fake** data-access services in memory through DI, e.g. `FakeAuthSession` from `src/app/auth/testing/` or `FakeProfileData` from `src/app/profile/testing/`. A new data-access service gets its fake in its feature's `testing/` folder, configured through constructor options that describe the situation (`{ signedInAs: 'ada@example.com' }`), and a default in `renderApp`. A Prototype's service gets no default: its tests pass the fake through `renderApp`'s `providers` option, e.g. `providers: [{ provide: NotesData, useValue: new FakeNotesData() }]`, so deleting the Prototype leaves `renderApp` untouched (see `docs/prototypes.md`). Something that happens while the user is on the page is a method the test calls after rendering, e.g. `FakeAuthSession.finishRestoring()` or `FakeSwUpdate.deployNewVersion()`.
- **Act** with `userEvent.setup()`: `type`, `click`.
- **Query** through `screen` in Testing Library's priority order: `getByRole` (with `name`), `getByLabelText`, then `getByText`. Use `findBy*` for whatever appears after a render, navigation or action: it retries until the element is in the DOM, so the test needs no fixture or change-detection call.
- **Assert** with jest-dom matchers: `toBeVisible`, `toHaveTextContent`, `toBeInvalid`.
- **Name** each test after the behaviour a user sees ("says so when the password is wrong"). Test names replace comments: see "Comments and naming" in `AGENTS.md`.

## Integration tests

`*.integration.spec.ts` files run the real data-access services against the emulators (`npm run test:integration`). They render nothing, though they run in jsdom like the component tests: configure providers with `TestBed.configureTestingModule` and get the service with `TestBed.inject`.

What every service built on `injectLiveData()` shares (live updates, `waitingToSync` online and offline, counted deletes, rejected writes, `loadFailed`, and no failure when sign-out shuts Firestore down) is tested once, in `src/app/firebase/inject-live-data.integration.spec.ts`. It runs in its own demo project (`demo-live-data`), with its own rules, open except for a marked write and a forbidden path, loaded through `initializeTestEnvironment({ firestore: { rules } })`, so it doesn't depend on any collection's rules. A data-access service's own integration spec covers only its mapping, commands and ordering, e.g. `src/app/notes/notes-data.integration.spec.ts`.

## Security-rules tests

Each collection's rules get a `*-rules.integration.spec.ts` beside its data-access service, e.g. `src/app/profile/profile-rules.integration.spec.ts`. They use `@firebase/rules-unit-testing`:

- `testEnvironmentWithDeployedFirestoreRules()` from `src/app/firebase/testing/deployed-firestore-rules.ts` in `beforeAll`: it passes no rules, since the emulator already runs `firestore.rules`, and `emulators:exec` sets `FIRESTORE_EMULATOR_HOST`.
- Write the starting documents in `withSecurityRulesDisabled`, under fresh IDs per test (`crypto.randomUUID()`), so tests never see each other's data. Don't call `clearFirestore`: other test files share the emulator.
- Act as a user through `authenticatedContext(uid)` or `unauthenticatedContext()`, using the modular SDK on `context.firestore()`, and check with `assertSucceeds` / `assertFails`.
- Cover the owner being allowed, other users and signed-out visitors being denied, and every data check in the rules.

Storage paths follow the same pattern, e.g. `src/app/profile/avatar-rules.integration.spec.ts`: `initializeTestEnvironment` with `storage: {}`, files at fresh paths per test, and ``context.storage(`gs://${storageBucket}`)`` so the bucket matches the app's. Run these files in Node (`// @vitest-environment node`): in jsdom, Storage's Node build sends jsdom's Blobs, which Node's `fetch` can't, so every upload fails before the rules see it. Integration tests that need TestBed stay in jsdom and swap in Node's `Blob` instead (see `profile-data.integration.spec.ts`).

