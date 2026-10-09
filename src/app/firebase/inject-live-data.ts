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
  FirestoreError,
  Query,
  QuerySnapshot,
  Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';
import { AuthSession } from '../auth/auth-session';
import { FIRESTORE } from './provide-firebase';

type Listenable = DocumentReference | Query;
type SnapshotOf<Target> = Target extends DocumentReference ? DocumentSnapshot : QuerySnapshot;

export interface LiveDataOptions<Ref extends Listenable, ListenTarget extends Listenable, T> {
  /** Where the signed-in user's data lives. */
  refFor: (firestore: Firestore, uid: string) => Ref;
  /** What to listen to, e.g. an ordered query on a collection `ref`; defaults to `ref` itself. */
  listenTo?: (ref: Ref) => ListenTarget;
  /** Turns each snapshot into `value`. */
  map: (snapshot: SnapshotOf<ListenTarget>) => T;
}

export interface LiveData<Ref extends Listenable, T> {
  /** The data, kept up to date; `undefined` until it has loaded. */
  readonly value: Signal<T | undefined>;
  /**
   * True while changes made on this device can't reach the server, e.g. offline. Misses a query's
   * delete still queued from before a page reload.
   */
  readonly waitingToSync: Signal<boolean>;
  /**
   * True when the data can't be loaded, e.g. Firestore refused to read it. Stays false when
   * sign-out, here or in another tab, shuts Firestore down.
   */
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
 * context is destroyed. Call it in a field initializer of a guarded page's data-access service; it
 * reads the uid once, since sign-out reloads the page. Imports the Firestore SDK, so only lazy
 * routes may reach it (ADR 0003).
 */
export function injectLiveData<Ref extends Listenable, T, ListenTarget extends Listenable = Ref>(
  options: LiveDataOptions<Ref, ListenTarget, T>,
): LiveData<Ref, T> {
  assertInInjectionContext(injectLiveData);
  const loadFirestore = inject(FIRESTORE);
  const errorHandler = inject(ErrorHandler);
  const uid = uidOfSignedInUser(inject(AuthSession));
  const value = signal<T | undefined>(undefined);
  const snapshotHasPendingWrites = signal(false);
  const listenerCutOffFromServer = signal(false);
  const unconfirmedWrites = signal(0);
  const loadFailed = signal(false);

  const ref = async (): Promise<Ref> => options.refFor(await loadFirestore(), uid);
  const listenTo =
    options.listenTo ?? ((resolvedRef: Ref) => resolvedRef as unknown as ListenTarget);

  let unsubscribe: Unsubscribe | undefined;
  let destroyed = false;
  inject(DestroyRef).onDestroy(() => {
    destroyed = true;
    unsubscribe?.();
  });
  const reportLoadFailureUnlessDestroyed = (error: unknown) => {
    if (destroyed) {
      return;
    }
    loadFailed.set(true);
    errorHandler.handleError(error);
  };
  ref().then((resolvedRef) => {
    if (destroyed) {
      return;
    }
    unsubscribe = listenToDocumentOrQueryIncludingMetadataChanges(
      listenTo(resolvedRef),
      (snapshot) => {
        value.set(options.map(snapshot));
        snapshotHasPendingWrites.set(snapshot.metadata.hasPendingWrites);
        listenerCutOffFromServer.set(snapshot.metadata.fromCache);
      },
      (error) => {
        if (!isShutdownBySignOut(error)) {
          reportLoadFailureUnlessDestroyed(error);
        }
      },
    );
  }, reportLoadFailureUnlessDestroyed);
  const reportRejectedWriteAsBug = (error: unknown) => errorHandler.handleError(error);

  return {
    value: value.asReadonly(),
    waitingToSync: computed(() =>
      isWaitingToSync(listenerCutOffFromServer(), snapshotHasPendingWrites(), unconfirmedWrites()),
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
  listenerCutOffFromServer: boolean,
  snapshotHasPendingWrites: boolean,
  unconfirmedTrackedWrites: number,
): boolean {
  return listenerCutOffFromServer && (snapshotHasPendingWrites || unconfirmedTrackedWrites > 0);
}
