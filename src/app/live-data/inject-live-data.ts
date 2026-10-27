import {
  DestroyRef,
  ErrorHandler,
  Signal,
  assertInInjectionContext,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  FirestoreError,
  Query,
  QuerySnapshot,
  Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { AuthSession } from '../auth/auth-session';
import { FIRESTORE } from '../firebase/provide-firebase';

type Listenable = DocumentReference | Query;
type SnapshotOf<Target> = Target extends DocumentReference ? DocumentSnapshot : QuerySnapshot;

/** Where the data lives: exactly one of `userRefFor` and `refFor`. */
type RefOption<Ref extends Listenable> =
  | {
      /**
       * Where the signed-in user's data lives. Throws without a signed-in user, and reads the uid
       * once, so only a guarded page's service may use it.
       */
      userRefFor: (firestore: Firestore, uid: string) => Ref;
      refFor?: never;
    }
  | {
      /** Where data that needs no user lives, e.g. shared or public data. Works signed out too. */
      refFor: (firestore: Firestore) => Ref;
      userRefFor?: never;
    };

export type LiveDataOptions<
  Ref extends Listenable,
  ListenTarget extends Listenable,
  T,
> = RefOption<Ref> & {
  /**
   * What to listen to, e.g. an ordered query on a collection `ref`; defaults to `ref` itself.
   * Tracked: when a signal it reads changes, Live data stops listening to the old query and
   * listens to the new one.
   */
  listenTo?: (ref: Ref) => ListenTarget;
  /** Turns each snapshot into `value`. */
  map: (snapshot: SnapshotOf<ListenTarget>) => T;
};

export interface LiveData<Ref extends Listenable, T> {
  /**
   * The data, kept up to date; `undefined` until it has loaded. Keeps the old query's data while
   * a new query loads.
   */
  readonly value: Signal<T | undefined>;
  /**
   * True until the first data arrives, and again from a change of query until the new query's
   * first data arrives, even from the cache. False once loading fails.
   */
  readonly loading: Signal<boolean>;
  /**
   * True while changes made on this device can't reach the server, e.g. offline. Misses a query's
   * delete still queued from before a page reload.
   */
  readonly waitingToSync: Signal<boolean>;
  /**
   * True when the data can't be loaded, e.g. Firestore refused to read it, until the query
   * changes. Stays false when sign-out, here or in another tab, shuts Firestore down.
   */
  readonly loadFailed: Signal<boolean>;
  /** Where the data lives, for commands to write to. */
  ref(): Promise<Ref>;
  /**
   * Lets a write to the data run in the background, so it also works offline: `value` shows it
   * straight away, and `waitingToSync` stays true until the server has it. Don't await the write:
   * offline, it would only settle once back online.
   */
  track(write: Promise<void>): void;
}

/**
 * Live data (see `CONTEXT.md`): listens to the data from now until the injection context is
 * destroyed. Call it in a field initializer of a data-access service. With `userRefFor` it reads
 * the uid once, since sign-out reloads the page, so only a guarded page's service may use it;
 * `refFor` works on any page. Imports the Firestore SDK, so only lazy routes may reach it
 * (ADR 0003).
 */
export function injectLiveData<Ref extends Listenable, T, ListenTarget extends Listenable = Ref>(
  options: LiveDataOptions<Ref, ListenTarget, T>,
): LiveData<Ref, T> {
  assertInInjectionContext(injectLiveData);
  const loadFirestore = inject(FIRESTORE);
  const errorHandler = inject(ErrorHandler);
  const refIn = refInFirestoreFor(options, inject(AuthSession));
  const value = signal<T | undefined>(undefined);
  const loading = signal(true);
  const snapshotHasPendingWrites = signal(false);
  const listenerServedFromCache = signal(false);
  const unconfirmedWrites = signal(0);
  const loadFailed = signal(false);
  const resolvedRef = signal<Ref | undefined>(undefined);

  const ref = async (): Promise<Ref> => refIn(await loadFirestore());
  const listenTo =
    options.listenTo ?? ((resolvedRef: Ref) => resolvedRef as unknown as ListenTarget);

  let destroyed = false;
  inject(DestroyRef).onDestroy(() => (destroyed = true));
  const reportLoadFailureUnlessDestroyed = (error: unknown) => {
    if (destroyed) {
      return;
    }
    loading.set(false);
    loadFailed.set(true);
    errorHandler.handleError(error);
  };
  const startLoadingNewQuery = () => {
    loading.set(true);
    loadFailed.set(false);
    snapshotHasPendingWrites.set(false);
    listenerServedFromCache.set(false);
  };
  ref().then((resolved) => {
    if (!destroyed) {
      resolvedRef.set(resolved);
    }
  }, reportLoadFailureUnlessDestroyed);
  effect((onCleanup) => {
    const current = resolvedRef();
    if (!current) {
      return;
    }
    let target: ListenTarget;
    try {
      target = listenTo(current);
    } catch (error) {
      untracked(() => reportLoadFailureUnlessDestroyed(error));
      return;
    }
    untracked(() => {
      startLoadingNewQuery();
      const unsubscribe = listenToDocumentOrQueryIncludingMetadataChanges(
        target,
        (snapshot) => {
          value.set(options.map(snapshot));
          snapshotHasPendingWrites.set(snapshot.metadata.hasPendingWrites);
          listenerServedFromCache.set(snapshot.metadata.fromCache);
          loading.set(false);
        },
        (error) => {
          if (!isShutdownBySignOut(error)) {
            reportLoadFailureUnlessDestroyed(error);
          }
        },
      );
      onCleanup(unsubscribe);
    });
  });
  const reportRejectedWriteAsBug = (error: unknown) => errorHandler.handleError(error);

  return {
    value: value.asReadonly(),
    loading: loading.asReadonly(),
    waitingToSync: computed(() =>
      isWaitingToSync(listenerServedFromCache(), snapshotHasPendingWrites(), unconfirmedWrites()),
    ),
    loadFailed: loadFailed.asReadonly(),
    ref,
    track(write) {
      unconfirmedWrites.update((count) => count + 1);
      write
        .catch(reportRejectedWriteAsBug)
        .finally(() => unconfirmedWrites.update((count) => count - 1));
    },
  };
}

function refInFirestoreFor<Ref extends Listenable>(
  option: RefOption<Ref>,
  session: AuthSession,
): (firestore: Firestore) => Ref {
  if (option.refFor) {
    return option.refFor;
  }
  const uid = uidOfSignedInUser(session);
  return (firestore) => option.userRefFor(firestore, uid);
}

function uidOfSignedInUser(session: AuthSession): string {
  const uid = session.user()?.uid;
  if (!uid) {
    throw new Error('injectLiveData needs a signed-in user.');
  }
  return uid;
}

function listenToDocumentOrQueryIncludingMetadataChanges<Target extends Listenable>(
  target: Target,
  onNext: (snapshot: SnapshotOf<Target>) => void,
  onError: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    target as Query,
    { includeMetadataChanges: true },
    (snapshot) => onNext(snapshot as SnapshotOf<Target>),
    onError,
  );
}

function isShutdownBySignOut(error: FirestoreError): boolean {
  return error.code === 'aborted';
}

function isWaitingToSync(
  listenerServedFromCache: boolean,
  snapshotHasPendingWrites: boolean,
  unconfirmedTrackedWrites: number,
): boolean {
  return listenerServedFromCache && (snapshotHasPendingWrites || unconfirmedTrackedWrites > 0);
}
