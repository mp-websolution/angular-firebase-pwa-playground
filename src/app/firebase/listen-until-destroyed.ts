import { DestroyRef, inject } from '@angular/core';
import {
  DocumentReference,
  DocumentSnapshot,
  Query,
  QuerySnapshot,
  Unsubscribe,
  onSnapshot,
} from 'firebase/firestore';

/**
 * Listens to a document or query, metadata changes included, from the moment its reference
 * resolves until the injection context it was called in is destroyed. `onError` gets a reference
 * that fails to resolve and a listener that fails, except when sign-out shuts Firestore down.
 * Imports the Firestore SDK, so only lazy routes may reach it (ADR 0003).
 */
export function listenUntilDestroyed<Ref extends DocumentReference | Query>(
  ref: Promise<Ref>,
  onNext: (snapshot: Ref extends DocumentReference ? DocumentSnapshot : QuerySnapshot) => void,
  onError: (error: unknown) => void,
): void {
  let unsubscribe: Unsubscribe | undefined;
  let destroyed = false;
  inject(DestroyRef).onDestroy(() => {
    destroyed = true;
    unsubscribe?.();
  });
  ref.then((resolvedRef) => {
    if (destroyed) {
      return;
    }
    // `onSnapshot` takes either at runtime; its overloads just can't take the generic.
    unsubscribe = onSnapshot(
      resolvedRef as Query,
      { includeMetadataChanges: true },
      onNext as (snapshot: QuerySnapshot) => void,
      (error) => {
        // Sign-out, here or in another tab, shuts Firestore down and reloads the page: nothing failed.
        if (error.code !== 'aborted') {
          onError(error);
        }
      },
    );
  }, onError);
}
