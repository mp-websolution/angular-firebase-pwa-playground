# Lazy Firestore behind a loader token

The `FIRESTORE` injection token provides a loader (`() => Promise<Firestore>`) instead of a Firestore instance. The first call downloads the Firestore SDK and initialises Firestore; later calls share that instance. The Firestore SDK is most of Firebase's weight (about 560 kB raw), and wiring it eagerly pushed the initial bundle past the 500 kB budget before the app had any features. Auth and Storage stay eager because they are small and Auth is needed at startup. We accept that every Firestore consumer is async at its entry point and that code importing values from `firebase/firestore` must live behind lazy routes.

## Consequences

- Only type imports from `firebase/firestore` are allowed in eagerly loaded code. The 500 kB warning / 1 MB error initial budget catches a value import slipping back into `main`.
- Data-access services that need Firestore await the loader (`await inject(FIRESTORE)()`) and are only reachable from lazy routes.
- Sign-out must clear Firestore's on-disk cache, so it loads Firestore if it isn't loaded yet (`signOutAndClearCache`).
- The PWA service worker must prefetch the Firestore chunk, so Firestore-backed pages and sign-out still work offline on a later visit.
- A failed load (e.g. the chunk download fails offline) is not cached: the next call tries again.
