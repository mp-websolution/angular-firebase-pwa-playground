# Features

A **Feature** (see `CONTEXT.md`) is a self-contained piece of the app beside the Baseline. It may use the Baseline, e.g. `AuthSession` or the `FIRESTORE` token, but the Baseline never uses it, and no Feature uses another. The notes Feature in `src/app/features/notes/` is the reference to copy.

## The features folder

Every Feature lives in its own folder under `src/app/features/`, next to the Feature route list, `src/app/features/features.routes.ts`. Everything else in `src/app/` is Baseline. Nothing outside `src/app/features/` imports from it, except `src/app/app.routes.ts`, which imports the Feature route list. `npm run lint` enforces these rules (ADR 0005, `sheriff.config.ts`).

## What a Feature owns

| Part | Notes Feature | Removed by |
|---|---|---|
| Route entry | `startPage` in `src/app/features/features.routes.ts`, since notes is the Template's start page; any other Feature is an entry in `featureRoutes`. Lazy, and titled with its page title | Deleting the entry, or for the start page pointing `startPage` at another Feature |
| Folder | `src/app/features/notes/`: its routes in `notes.routes.ts`, the only public TypeScript file, and its Firestore rules fragment `notes.firestore.rules`. Everything else is in `internal/`: pages, data-access service, model, tests and fake (`internal/testing/`) | Deleting the folder |
| Seed data | `scripts/seed/feature-notes.mjs` | Deleting the file |

Removing those 3 leaves the Baseline building and its tests green while at least one Feature is left: `startPage` is required, so `src/app/app.routes.ts` doesn't build without a start page. The Baseline's tests land on a stand-in start page (`standInStartPage` in `src/app/testing/`), so they don't depend on yours. Only docs mention a Feature elsewhere: `docs/baseline-manual.md` and `docs/agents/testing.md` use the notes Feature as their example.

## Adding a Feature

1. Copy `src/app/features/notes/` to `src/app/features/<name>/` and rename inside it. Use lowercase letters and hyphens only in `<name>`: lint doesn't check a folder whose name has digits or other symbols as a Feature. Keep the shape:
   - `<name>.routes.ts` exports the Feature's routes, relative to its path (to `/` for the start page), with `canActivate: [signedInGuard]` on those that need a signed-in user. Notes has none: signed-out visitors read the board too. It stays at the top of the folder, the Feature's only public file. Its path and title live in the Feature route list, unlike a Baseline module's routes file, which declares its own top-level paths and titles (ADR 0007).
   - Everything else goes in `internal/`, so only the Feature's own files can import it: the Feature route list reaches the Feature only through its routes. `npm run lint` enforces this (ADR 0006).
   - A data-access service per collection, like `NotesData`: `@Service()`, read state as signals, commands as promise-returning methods, no SDK types in its public API.
   - The service gets its data through `injectLiveData()` from `src/app/live-data/inject-live-data.ts`, in a field initializer. It takes exactly one of 2 keys for where the data lives:
     - `userRefFor(firestore, uid)` for the signed-in user's own data, e.g. `ProfileData`'s profile. It throws without a signed-in user and reads the uid once, so only a guarded page's service uses it.
     - `refFor(firestore)` for shared or public data, e.g. `NotesData`'s `notes`. It needs no user, so it works on unguarded pages, signed out too.

     `listenTo` optionally narrows the data to a query, and `map` turns each snapshot into the service's model. `listenTo` follows signals: when one it reads changes, e.g. `NotesData`'s "mine / all" filter, Live data drops the old query's listener and listens to the new query. It loads Firestore, listens until destroyed, and exposes `value`, `loading`, `waitingToSync` and `loadFailed` for the service to pass on. `value` keeps the old query's data until the new query's first data arrives, and `loading` is true until then (and before the first load), so a page can dim its stale list. Each command writes to `await live.ref()` and hands the unawaited write to `live.track()`, so it works offline, counts towards `waitingToSync`, and reports a rejection.
   - A query that filters on one field and orders by another needs a composite index, and the deploy ships rules only. `NotesData` sorts in `map` instead.
   - `internal/testing/` holds an in-memory fake of that service for component tests.
   - Link the Baseline's pages and other Features as literals, e.g. `routerLink="/profile"` (where sign-out is) and `routerLink="/"` for the start page. There is no home page or navigation shell.
2. Add an entry to `featureRoutes` in `src/app/features/features.routes.ts` with a `path`, `loadChildren` and a `title`, which sets the page title. Or make it the start page: point `startPage` at it, with `loadChildren` and a `title` but no `path`, and move the previous start page into `featureRoutes` with a path, or remove it. The start page is mounted after every other route, so a Baseline path or another Feature's path always wins a clash: give its children paths of their own (ADR 0009).
3. Store per-user data under `users/{uid}/<collection>`, open to its owner only, and shared data in a top-level `<collection>` whose documents name their author, as notes' `authorUid` does. Write the rules in `<name>.firestore.rules` at the top of the Feature's folder (and `<name>.storage.rules` for files). See "Rules fragments" below.
4. Add `scripts/seed/feature-<name>.mjs` for demo data.
5. Write the tests (see `docs/agents/testing.md`):
   - Component tests render through `renderApp` and pass the fake with `providers: [{ provide: NotesData, useValue: new FakeNotesData(...) }]`. `renderApp` has no default for a Feature's service, so the Baseline's tests never depend on one.
   - Integration tests for the service covering its mapping, commands, ordering and any query that follows a signal, e.g. notes' filter switch. Rules tests cover per-user data with the owner allowed and other users and signed-out visitors denied, and shared data with who may read it, who may create it, only the author changing or deleting it, and a forged author rejected. Sync, offline, loading and sign-out behaviour belong to `injectLiveData()` and are tested there, not per Feature.

## Rules fragments

Firestore and Storage rules have no include mechanism, so `npm run rules:assemble` (`scripts/assemble-rules.mjs`) builds the deployed rules. For each service it takes the Baseline's `firestore.rules` or `storage.rules` and replaces its marker line with every Feature's fragment, in Feature-name order, each between `Feature: <name>` comments. The result goes to `assembled-rules/`, which is gitignored and is what `firebase.json` points to. `npm start`, `npm run test:integration` and the deploy assemble the rules first, so never edit `assembled-rules/`.

- A fragment holds `match` blocks for the inside of the documents match (Firestore) or the bucket match (Storage), written without indentation. It can call the Baseline's rule functions, e.g. `isSignedInAsOwner` and `isTrimmedTextOfLength`.
- Name it `<name>.firestore.rules` or `<name>.storage.rules`, at the top of the Feature's folder, next to `<name>.routes.ts`. A Storage fragment is optional.
- The assembly fails on a fragment named after anything but its folder, in a folder without a routes file, or of a Feature whose name isn't lowercase letters and hyphens.

## Keep Firestore behind the lazy route

The Firestore SDK is most of Firebase's weight, so it loads on first use, never with the initial bundle (ADR 0003). For a Feature that means:

- Only files reached through its `loadChildren` import values from `firebase/firestore` or `injectLiveData()`. Its data-access service gets Firestore through `injectLiveData()`, or with `await inject(FIRESTORE)()` for anything else.
- On top of the import rule in "The features folder": inside `src/app/features/`, only the Feature route list reaches into a Feature's folder, and only through the `import()` in its `loadChildren`. Lint fails when the Feature route list imports any Feature file other than its routes file.
- `npm run build` warns when the initial bundle passes 500 kB: that usually means a value import from `firebase/firestore` slipped into `main`.
- Lint checks neither the lazy `import()` nor where values from `firebase/firestore` are imported: it treats static and dynamic imports alike and ignores third-party imports. Only review and the bundle budget catch a break.

## Removing a Feature

Keep at least one Feature: `startPage` is required. A Project adds its first Feature before deleting the notes Feature, or in the same PR.

1. Delete its entry in `src/app/features/features.routes.ts`. If it's the start page, point `startPage` at another Feature first.
2. Delete its folder under `src/app/features/`, which deletes its rules fragments too.
3. Delete its `scripts/seed/feature-<name>.mjs`.
4. Run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`.
5. Removing the notes Feature from the Template? Point the examples in `docs/baseline-manual.md` and `docs/agents/testing.md` at another Feature, or drop them. A Project leaves them as they are: they are Baseline files.

Data already stored in a deployed project stays there; with its rules fragment gone, nobody can read or write it.
