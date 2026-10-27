# How Live data covers shared and public data

Type: grilling

## Question

How does Live data stretch beyond the signed-in user's own data, so a Feature can listen to shared collections (written by many users) and public ones (read signed out) with the same sync and offline behaviour? And how can the listened-to query follow a signal, such as the month on screen?

## Why

The first Project, `tango-calendar-pwa`, has a public Calendar Feature. Anyone reads its top-level `events` and `organizers` collections, signed in or not. The Admin section, which belongs to the same Feature, lets Editors and Admins write shared `events`. Visitors move from month to month, so the query changes while the page stays open. Without a Baseline change the Feature would call `await inject(FIRESTORE)()` and `onSnapshot` itself and copy Live data's pending-write and offline tracking.

## Facts

- `injectLiveData()` (`src/app/live-data/inject-live-data.ts`): `refFor(firestore, uid)` builds the ref, and `uidOfSignedInUser` throws without a signed-in user. The uid is read once, since sign-out reloads the page.
- It resolves `listenTo(ref)` once and listens until the injection context is destroyed, so the query can't change.
- It exposes `value`, `waitingToSync` (listener served from cache and pending or tracked writes), `loadFailed`, `ref()` and `track(write)`. A listener error with code `aborted` counts as a sign-out shutdown and isn't reported.
- Its users are `ProfileData` (`profiles/{uid}`) and the notes Feature (`users/{uid}/notes`).
- The glossary defines **Live data** as "The signed-in user's Firestore data, kept up to date on this device, ...".
- `signOutAndClearCache` terminates Firestore and clears its IndexedDB cache, then signs out. Public data cached signed in is dropped too.
- Firestore uses `persistentLocalCache` with a multi-tab manager by default (`firestoreCache` setting). ADR 0003 keeps the SDK out of the initial bundle.

## Decisions to settle

- The term: does **Live data** widen to "Firestore data this device listens to", or does shared/public data get its own term?
- The API shape: is `refFor` given a uid only when there is one (an optional uid, or a separate option or overload)? What happens when a ref needs a uid and nobody is signed in?
- A query that follows a signal: does `listenTo` (or `refFor`) read signals, so Live data re-subscribes when they change? What do `value` and `waitingToSync` show between queries: the old value, `undefined`, or a loading flag?
- Signed-out use: does Live data stay alive across sign-in and sign-out, given that sign-out reloads the page and clears the cache today?
- Whether `track()` and `waitingToSync` stay as they are for shared writes, where rules may reject a write another user's change made invalid.
- Tests: the existing Live data integration tests, plus signed-out and query-change cases. Docs: `docs/features.md` step 1, the glossary, and the release type and its upgrade note.

## Related

- `.scratch/feature-start-page/` (the same Project's public start page) and `.scratch/sign-in-methods/`.
- Out of scope: Firestore rules for shared data. A Feature writes them in its own rules fragment today.
