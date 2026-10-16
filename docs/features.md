# Features

A **Feature** (see `CONTEXT.md`) is a self-contained piece of the app beside the Baseline. It may use the Baseline, e.g. `AuthSession` or the `FIRESTORE` token, but the Baseline never uses it, and no Feature uses another. The notes Feature in `src/app/features/notes/` is the reference to copy.

## The features folder

Every Feature lives in its own folder under `src/app/features/`, next to the Feature route list, `src/app/features/features.routes.ts`. Everything else in `src/app/` is Baseline. Nothing outside `src/app/features/` imports from it, except `src/app/app.routes.ts` and home, which import the Feature route list. `npm run lint` enforces these rules (ADR 0005, `sheriff.config.ts`).

## What a Feature owns

| Part | Notes Feature | Removed by |
|---|---|---|
| Route entry | `notes` in `src/app/features/features.routes.ts`: lazy and titled. Home links to every entry there, by its title | Deleting the entry |
| Folder | `src/app/features/notes/`: its routes, pages, data-access service, model, fake (`testing/`) and tests | Deleting the folder |
| Rules section | The block between the `Feature: notes` markers in `firestore.rules` | Deleting the block |
| Seed data | `scripts/seed/feature-notes.mjs` | Deleting the file |

Removing those four leaves the Baseline building and its tests green, except home's test of the Features navigation in `src/app/home/home.spec.ts`, which lists every Feature's link. Only docs mention a Feature elsewhere: `README.md` and `docs/agents/testing.md` use the notes Feature as their example.

## Adding a Feature

1. Copy `src/app/features/notes/` to `src/app/features/<name>/` and rename inside it. Use lowercase letters and hyphens only in `<name>`: lint checks no other folder as a Feature. Keep the shape:
   - `<name>.routes.ts` exports the Feature's routes, relative to its path, with `canActivate: [signedInGuard]` on those that need a signed-in user.
   - A data-access service per collection, like `NotesData`: `@Service()`, read state as signals, commands as promise-returning methods, no SDK types in its public API.
   - The service gets its data through `injectLiveData()` from `src/app/live-data/inject-live-data.ts`, in a field initializer: `ref` says where the signed-in user's data lives, `listenTo` optionally narrows it to a query, and `map` turns each snapshot into the service's model. It loads Firestore, listens until destroyed, and exposes `value`, `waitingToSync` and `loadFailed` for the service to pass on. Each command writes to `await live.ref()` and hands the unawaited write to `live.track()`, so it works offline, counts towards `waitingToSync`, and reports a rejection.
   - `testing/` holds an in-memory fake of that service for component tests.
2. Add an entry to `featureRoutes` in `src/app/features/features.routes.ts` with `loadChildren` and a `title`, which becomes the link on home.
3. Store per-user data under `users/{uid}/<collection>`, and add a delimited section to `firestore.rules` (and `storage.rules` if needed) that opens it to its owner only.
4. Add `scripts/seed/feature-<name>.mjs` for demo data.
5. Write the tests (see `docs/agents/testing.md`):
   - Add the new Feature's link to home's Features navigation test in `src/app/home/home.spec.ts`.
   - Component tests render through `renderApp` and pass the fake with `providers: [{ provide: NotesData, useValue: new FakeNotesData(...) }]`. `renderApp` has no default for a Feature's service, so the Baseline's tests never depend on one.
   - Integration tests for the service covering its mapping, commands and ordering, and rules tests covering the owner allowed and other users and signed-out visitors denied. Sync, offline and sign-out behaviour belong to `injectLiveData()` and are tested there, not per Feature.

## Keep Firestore behind the lazy route

The Firestore SDK is most of Firebase's weight, so it loads on first use, never with the initial bundle (ADR 0003). For a Feature that means:

- Only files reached through its `loadChildren` import values from `firebase/firestore` or `injectLiveData()`. Its data-access service gets Firestore through `injectLiveData()`, or with `await inject(FIRESTORE)()` for anything else.
- On top of the import rule in "The features folder": inside `src/app/features/`, only the Feature route list reaches into a Feature's folder, and only through the `import()` in its `loadChildren`.
- `npm run build` warns when the initial bundle passes 500 kB: that usually means a value import from `firebase/firestore` slipped into `main`.
- Lint checks neither the lazy `import()` nor where values from `firebase/firestore` are imported: it treats static and dynamic imports alike and ignores third-party imports. Only review and the bundle budget catch a break.

## Removing a Feature

1. Delete its entry in `src/app/features/features.routes.ts`.
2. Delete its folder under `src/app/features/`.
3. Delete its section in `firestore.rules` (and `storage.rules`).
4. Delete its `scripts/seed/feature-<name>.mjs`.
5. Drop its link from home's Features navigation test in `src/app/home/home.spec.ts`.
6. Run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`.
7. Removing the notes Feature? Point the examples in `README.md` and `docs/agents/testing.md` at another Feature, or drop them.

Data already stored in a deployed project stays there; with the rules section gone, nobody can read or write it.
