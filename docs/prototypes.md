# Prototypes

A **Prototype** (see `CONTEXT.md`) is a self-contained feature beside the Baseline. It may use the Baseline, e.g. `AuthSession` or the `FIRESTORE` token, but the Baseline never uses it, and no Prototype uses another. The notes Prototype in `src/app/notes/` is the reference to copy.

## What a Prototype owns

| Part | Notes Prototype | Removed by |
|---|---|---|
| Route entry | `notes` in `src/app/prototypes.routes.ts`: lazy and titled. Home links to every entry there, by its title | Deleting the entry |
| Folder | `src/app/notes/`: its routes, pages, data-access service, model, fake (`testing/`) and tests | Deleting the folder |
| Rules section | The block between the `Prototype: notes` markers in `firestore.rules` | Deleting the block |
| Seed data | `scripts/seed/prototype-notes.mjs` | Deleting the file |

Removing those four leaves the Baseline building and its tests green. Nothing else refers to a Prototype.

## Adding a Prototype

1. Copy `src/app/notes/` to `src/app/<name>/` and rename inside it. Keep the shape:
   - `<name>.routes.ts` exports the Prototype's routes, relative to its path, with `canActivate: [signedInGuard]` on those that need a signed-in user.
   - A data-access service per collection, like `NotesData`: `@Service()`, read state as signals, commands as promise-returning methods, no SDK types in its public API.
   - `testing/` holds an in-memory fake of that service for component tests.
2. Add an entry to `prototypeRoutes` in `src/app/prototypes.routes.ts` with `loadChildren` and a `title`, which becomes the link on home.
3. Store per-user data under `users/{uid}/<collection>`, and add a delimited section to `firestore.rules` (and `storage.rules` if needed) that opens it to its owner only.
4. Add `scripts/seed/prototype-<name>.mjs` for demo data.
5. Write the tests (see `docs/agents/testing.md`):
   - Component tests render through `renderApp` and pass the fake with `providers: [{ provide: NotesData, useValue: new FakeNotesData(...) }]`. `renderApp` has no default for a Prototype's service, so the Baseline's tests never depend on one.
   - Integration tests for the service, and rules tests covering the owner allowed and other users and signed-out visitors denied.

## Keep Firestore behind the lazy route

The Firestore SDK is most of Firebase's weight, so it loads on first use, never with the initial bundle (ADR 0003). For a Prototype that means:

- Only files reached through its `loadChildren` import values from `firebase/firestore`. Its data-access service gets Firestore with `await inject(FIRESTORE)()`.
- Nothing outside the Prototype's folder imports from it, except the `loadChildren` in its route entry.
- `npm run build` warns when the initial bundle passes 500 kB: that usually means a value import from `firebase/firestore` slipped into `main`.

## Removing a Prototype

1. Delete its entry in `src/app/prototypes.routes.ts`.
2. Delete its folder under `src/app/`.
3. Delete its section in `firestore.rules` (and `storage.rules`).
4. Delete its `scripts/seed/prototype-<name>.mjs`.
5. Run `npm run lint`, `npm test`, `npm run test:integration` and `npm run build`.

Data already stored in a deployed project stays there; with the rules section gone, nobody can read or write it.
