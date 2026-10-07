# 10: Live data module

**Spec:** `.scratch/baseline/spec.md`

**What to build:** Deepen `listenUntilDestroyed` into `injectLiveData()`, one Baseline module that owns the signed-in user's **Live data** (see `CONTEXT.md`) end to end: loading Firestore, scoping to the signed-in uid, listening until destroyed, `waitingToSync`, `loadFailed`, and background writes. `ProfileData` and `NotesData` keep only their mapping and commands, so every Prototype copied from notes inherits the sync semantics instead of re-deriving them. Today the two copies have already drifted (3c28379 fixed `waitingToSync` for the profile; 3fdcae3 re-learned it for notes, plus delete counting).

**Blocked by:** none

**Status:** ready-for-agent

## Decisions (architecture review, 2026-10-07)

1. One module, generic over a document and a query, like `listenUntilDestroyed`.
2. An `inject*` function: it injects `FIRESTORE`, `ErrorHandler`, `AuthSession` and `DestroyRef` itself and asserts its injection context, like `injectReturnUrl`.
3. A function called in a field initializer, returning an object; no base class, no per-module provider.
4. It owns the writes, so `waitingToSync` stays right without callers knowing which writes are special.
5. `src/app/firebase/inject-live-data.ts`, `injectLiveData()`; replaces and deletes `src/app/firebase/listen-until-destroyed.ts`.
6. `waitingToSync = fromCache && (hasPendingWrites || unconfirmedWrites > 0)`: every tracked write counts until its promise settles. Covers deletes, which leave a query's snapshot along with their pending write.
7. Read side:
   ```ts
   readonly #live = injectLiveData({
     ref: (firestore, uid) => collection(firestore, 'users', uid, 'notes'),
     listenTo: (notesRef) => query(notesRef, orderBy('createdAt', 'desc')), // optional, defaults to ref
     map: (snapshot) => snapshot.docs.map(...),
   });
   // value: Signal<T | undefined>, waitingToSync: Signal<boolean>, loadFailed: Signal<boolean>
   ```
   Gets the uid from `AuthSession`; throws "needs a signed-in user" when nobody is signed in. Ignores the `aborted` listener error that sign-out causes.
8. Write side: `ref(): Promise<Ref>` and `track(write: Promise<void>)`, which runs the write in the background, counts it until it settles, and reports a rejection to `ErrorHandler`. `ProfileData.uploadAvatar` keeps awaiting its Storage upload itself, then `track`s the `setDoc`.
9. Tested at its own interface: `inject-live-data.integration.spec.ts` uses its own demo project ID (e.g. `demo-live-data`) with allow-all rules loaded through `initializeTestEnvironment({ firestore: { rules } })`, at a scratch path, covering a document and a query: live updates, sync, offline, deletes, rejections, load failure, and sign-out's `aborted`. The emulators' `singleProjectMode` only warns about the second project ID. `ProfileData`'s and `NotesData`'s integration specs drop the cases now covered there (sync, offline, abort) and keep mapping, commands and ordering. Component tests and fakes stay as they are (ADR 0004).
10. Docs in the same change: `docs/prototypes.md` (recipe uses `injectLiveData()`, Prototypes no longer write sync/offline/abort integration cases), `docs/agents/testing.md` (where those cases live), and AGENTS.md (amend "never hide `inject()`" to allow `inject*` functions that assert their injection context).

## Acceptance

- [x] `injectLiveData()` with its integration spec, written test-first
- [x] `ProfileData` and `NotesData` use it; their public interfaces, and so their fakes, are unchanged
- [x] `listen-until-destroyed.ts` deleted
- [x] `ProfileData` and `NotesData` integration specs trimmed to mapping, commands and ordering
- [x] Docs updated (decision 10)
- [x] `npm run lint`, `npm test`, `npm run test:integration` and `npm run build` pass; initial bundle stays under budget (ADR 0003)
