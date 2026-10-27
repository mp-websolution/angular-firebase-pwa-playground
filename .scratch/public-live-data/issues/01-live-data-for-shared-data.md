# Live data covers shared and public data; notes becomes a shared board

**Release:** `baseline-v2.0.0`, shared with `.scratch/feature-start-page/` and `.scratch/sign-in-methods/`

**What to build:** Live data works for shared and public data as well as the user's own:
- `injectLiveData()` takes either `userRefFor(firestore, uid)`, which is today's `refFor` renamed, or a new `refFor(firestore)` with no uid.
- `listenTo` follows signals.

The notes reference Feature becomes a public, shared notes board that demos all of this, and profile stays the user-scoped example.

**Blocked by:** `.scratch/feature-start-page/` (notes is the start page there)

**Status:** ready-for-agent

## Why

The first Project, `tango-calendar-pwa`, has a public Calendar Feature. Anyone reads its top-level `events` and `organizers`, signed in or not. Editors and Admins write shared `events`, and visitors move from month to month, so the query changes while the page stays open. Today Live data needs a uid and listens to one fixed query.

## Decisions (grilling, 2026-10-27)

1. **Term:** **Live data** widens to "Firestore data this device listens to, kept up to date, with whether changes are waiting to sync and whether loading failed". It covers the user's own, shared and public data, with one term and one module.
2. **API:** `LiveDataOptions` takes exactly one of 2 keys, as a union type:
   - `userRefFor(firestore, uid)`: today's `refFor`, renamed. Signed-in only, and it throws without a user. The uid is still read once, so it needs a guarded page.
   - `refFor(firestore)`: no user needed, so it works on unguarded pages before `AuthSession` resolves.
3. **Signal-driven query:** `listenTo(ref)` runs tracked. When a signal it reads changes, Live data stops the old listener and listens to the new query. `userRefFor` and `refFor` stay untracked.
4. **Between queries:** `value` resets to `undefined` and `loadFailed` to `false`, and the old listener's `fromCache` and pending-write flags clear. There's no new loading flag.
5. **Tracked writes:** the count of unconfirmed writes carries over a query change.
6. **Lifecycle:** unchanged. Sign-in doesn't reload, and listeners continue with the new token. Sign-out still clears the cache and reloads. A signed-out visitor's cache persists, so public data works offline.
7. **Rejected writes:** `track()` still reports them to `ErrorHandler` as bugs.
8. **ADR:** none.
9. **Notes becomes a shared board:**
   - **Data:** a top-level `notes` collection, where each doc holds `authorUid`.
   - **Reading:** anyone, signed out too. Notes' `signedInGuard` goes, so `/` shows notes to anonymous visitors.
   - **Writing:** the composer shows only when signed in. Any signed-in user creates notes, but only the author edits or deletes one (`request.auth.uid == resource.data.authorUid`).
   - **Filter:** a "mine / all" signal, offered only when signed in, switches `listenTo` between all notes and `where('authorUid', '==', uid)`.
   - **Links:** signed out, notes links `/sign-in`; signed in, it links `/profile`.
   - **Data service:** `NotesData` uses `refFor`. `ProfileData` only gets the `userRefFor` rename.
10. **Tests:**
    - `inject-live-data.integration.spec.ts`:
      - Existing `describe`s use `userRefFor`, and "throws without a signed-in user" stays.
      - A new `describe('of shared data')` uses `refFor` and covers listening signed out (rules allow public read) and a signed-in tracked write.
      - A query whose signal changes: the old listener stops, `value` goes `undefined` and then shows the new query, and `loadFailed` resets.
    - Notes rules tests cover public read, signed-in create, author-only edit/delete, and a rejected forged `authorUid`.
    - Notes integration specs cover the filter switch.
    - The seeders write to top-level `notes`.
    - Notes' component tests cover the signed-out view (no composer, a sign-in link).
11. **Docs:**
    - `CONTEXT.md`: the widened **Live data** definition.
    - `injectLiveData`'s doc comment: only `userRefFor` needs a guarded page.
    - `docs/features.md` step 1: `userRefFor` vs `refFor`, and a `listenTo` that reads a signal. Its rules-test line covers shared data.
    - `docs/agents/testing.md`: the new shared cases.
12. **Release entry** (`baseline-v2.0.0`, see `.scratch/feature-start-page/` decision 9):
    - **Sentence:** Live data covers shared and public data and queries that follow signals. Notes is now a public, shared board.
    - **Project actions:**
      - Rename `refFor` to `userRefFor` in every `injectLiveData()` call.
      - Projects that kept the notes Feature: its data moved from `users/{uid}/notes` to `notes`, and there's no migration.

## Acceptance

- [ ] `userRefFor` / `refFor` union and tracked `listenTo` in `inject-live-data.ts`, written test-first
- [ ] `ProfileData` renamed to `userRefFor`. Its spec and fake are unchanged.
- [ ] Notes is a shared board with public read, author-only edit/delete and a "mine / all" filter. Rules, seeders and specs are updated.
- [ ] Docs (decision 11) and the release entry (decision 12)
- [ ] `npm run lint`, `npm test`, `npm run test:integration` and `npm run build` pass. The initial bundle stays under budget (ADR 0003).

## Out of scope

- Roles. A Project keeps them in its own documents and rules.
- Choosing sign-in methods: `.scratch/sign-in-methods/`.
