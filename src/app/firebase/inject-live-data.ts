import {
  DestroyRef,
  ErrorHandler,
  Signal,
  assertInInjectionContext,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QuerySnapshot,
  Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { AuthSession } from '../auth/auth-session';
import { FIRESTORE } from './provide-firebase';

type Listenable = DocumentReference | Query;
type SnapshotOf<Listened> = Listened extends DocumentReference ? DocumentSnapshot : QuerySnapshot;

export interface LiveDataOptions<Ref extends Listenable, Listened extends Listenable, T> {
  /** Where the signed-in user's data lives. */
  ref: (firestore: Firestore, uid: string) => Ref;
  /** What to listen to, e.g. an ordered query on a collection `ref`; defaults to `ref` itself. */
  listenTo?: (ref: Ref) => Listened;
  /** Turns each snapshot into `value`. */
  map: (snapshot: SnapshotOf<Listened>) => T;
}

export interface LiveData<Ref extends Listenable, T> {
  /** The data, kept up to date; `undefined` until it has loaded. */
  readonly value: Signal<T | undefined>;
  /** True while changes made on this device can't reach the server, e.g. offline. */
  readonly waitingToSync: Signal<boolean>;
  /** True when the data can't be loaded, e.g. Firestore refused to read it. */
  readonly loadFailed: Signal<boolean>;
  /** Where the signed-in user's data lives, for commands to write to. */
  ref(): Promise<Ref>;
  /**
   * Lets a write to the data run in the background, so it also works offline: `value` shows it
   * straight away, and `waitingToSync` stays true until the server has it. Don't await the write:
   * offline, it would only settle once back online.
   */
  track(write: Promise<void>): void;
}

/**
 * The signed-in user's Live data (see `CONTEXT.md`): listens to it from now until the injection
 * context is destroyed. Call it in a field initializer of a page's data-access service. Imports
 * the Firestore SDK, so only lazy routes may reach it (ADR 0003).
 */
export function injectLiveData<Ref extends Listenable, T, Listened extends Listenable = Ref>(
  options: LiveDataOptions<Ref, Listened, T>,
): LiveData<Ref, T> {
  assertInInjectionContext(injectLiveData);
  const loadFirestore = inject(FIRESTORE);
  const errorHandler = inject(ErrorHandler);
  // Pages with live data are guarded, so someone is signed in. Whenever that user goes away, the
  // page reloads (see AuthSession), so the uid never changes for this instance.
  const uid = inject(AuthSession).user()?.uid;
  if (!uid) {
    throw new Error('injectLiveData needs a signed-in user.');
  }
  const value = signal<T | undefined>(undefined);
  const snapshotHasPendingWrites = signal(false);
  const snapshotFromCache = signal(false);
  const unconfirmedWrites = signal(0);
  const loadFailed = signal(false);

  const ref = async (): Promise<Ref> => options.ref(await loadFirestore(), uid);
  const listenTo = options.listenTo ?? ((resolvedRef: Ref) => resolvedRef as unknown as Listened);

  let unsubscribe: Unsubscribe | undefined;
  let destroyed = false;
  inject(DestroyRef).onDestroy(() => {
    destroyed = true;
    unsubscribe?.();
  });
  const onError = (error: unknown) => {
    loadFailed.set(true);
    errorHandler.handleError(error);
  };
  ref().then((resolvedRef) => {
    if (destroyed) {
      return;
    }
    // Metadata changes too, so `waitingToSync` follows the connection and the server's replies.
    // `onSnapshot` takes either at runtime; its overloads just can't take the generic.
    unsubscribe = onSnapshot(
      listenTo(resolvedRef) as Query,
      { includeMetadataChanges: true },
      (snapshot) => {
        value.set(options.map(snapshot as SnapshotOf<Listened>));
        snapshotHasPendingWrites.set(snapshot.metadata.hasPendingWrites);
        snapshotFromCache.set(snapshot.metadata.fromCache);
      },
      (error) => {
        // Sign-out, here or in another tab, shuts Firestore down and reloads the page: nothing failed.
        if (error.code !== 'aborted') {
          onError(error);
        }
      },
    );
  }, onError);

  return {
    value: value.asReadonly(),
    // Online, every change is pending for a moment too; only `fromCache` means the listener has
    // lost the server. A deleted document leaves a query's snapshot, and its pending write with
    // it, so every write counts until the server has it. A write still queued from before a reload
    // isn't counted.
    waitingToSync: computed(
      () => snapshotFromCache() && (snapshotHasPendingWrites() || unconfirmedWrites() > 0),
    ),
    loadFailed: loadFailed.asReadonly(),
    ref,
    track(write) {
      unconfirmedWrites.update((count) => count + 1);
      write
        .catch((error: unknown) => {
          // Pages only send what the rules accept, so a rejection is a bug. Firestore has already
          // undone the change, so `value` shows what the server kept.
          errorHandler.handleError(error);
        })
        .finally(() => unconfirmedWrites.update((count) => count - 1));
    },
  };
}
