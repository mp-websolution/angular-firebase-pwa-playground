# Testing

How tests are written here (ADR 0004). For component tests this guide replaces the `angular-developer` skill's `testing-fundamentals.md`, `component-harnesses.md` and `router-testing.md`.

## Component tests

A component test renders the whole app through the router and drives it the way a user would.

- **Render** with `renderApp(url, session?, { profile?, extraRoutes? })` from `src/app/testing/render-app.ts`. It renders `App` with the real routes at `url`, with every data-access service faked. A page that doesn't exist yet goes in `extraRoutes`.
- **Fake** data-access services in memory through DI, e.g. `FakeAuthSession` from `src/app/auth/testing/` or `FakeProfileData` from `src/app/profile/testing/`. A new data-access service gets its fake in its feature's `testing/` folder, configured through constructor options that describe the situation (`{ signedInAs: 'ada@example.com' }`), and a default in `renderApp`.
- **Act** with `userEvent.setup()`: `type`, `click`.
- **Query** through `screen` in Testing Library's priority order: `getByRole` (with `name`), `getByLabelText`, then `getByText`. Use `findBy*` for whatever appears after a render, navigation or action: it retries until the element is in the DOM, so the test needs no fixture or change-detection call.
- **Assert** with jest-dom matchers: `toBeVisible`, `toHaveTextContent`, `toBeInvalid`.
- **Name** each test after the behaviour a user sees ("says so when the password is wrong").

## Integration tests

`*.integration.spec.ts` files run the real data-access services against the emulators (`npm run test:integration`). They have no DOM: configure providers with `TestBed.configureTestingModule` and get the service with `TestBed.inject`.

## Security-rules tests

Each collection's rules get a `*-rules.integration.spec.ts` beside its data-access service, e.g. `src/app/profile/profile-rules.integration.spec.ts`. They use `@firebase/rules-unit-testing`:

- `initializeTestEnvironment` with `firestore: {}` and no rules: the emulator already runs `firestore.rules`, and `emulators:exec` sets `FIRESTORE_EMULATOR_HOST`.
- Write the starting documents in `withSecurityRulesDisabled`, under fresh IDs per test (`crypto.randomUUID()`), so tests never see each other's data. Don't call `clearFirestore`: other test files share the emulator.
- Act as a user through `authenticatedContext(uid)` or `unauthenticatedContext()`, using the modular SDK on `context.firestore()`, and check with `assertSucceeds` / `assertFails`.
- Cover the owner being allowed, other users and signed-out visitors being denied, and every data check in the rules.

