import {
  DestroyRef,
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { FirebaseApp, deleteApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, signOut } from 'firebase/auth';
// Type-only: the Firestore SDK is most of Firebase's weight, so it loads on first use, never in main.
import type { Firestore } from 'firebase/firestore';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';
import type { FirebaseSettings } from './firebase-settings.model';

const FIREBASE_SETTINGS = new InjectionToken<FirebaseSettings>('FIREBASE_SETTINGS');
const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');

/** Loads the Firestore SDK and initialises Firestore on the first call; later calls share it. */
export type LoadFirestore = () => Promise<Firestore>;

export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');
export const FIRESTORE = new InjectionToken<LoadFirestore>('FIRESTORE');
export const FIREBASE_STORAGE = new InjectionToken<FirebaseStorage>('FIREBASE_STORAGE');

/** Initialises the Firebase app once and exposes Auth, Firestore and Storage through injection tokens. */
export function provideFirebase(settings: FirebaseSettings): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: FIREBASE_SETTINGS, useValue: settings },
    { provide: FIREBASE_APP, useFactory: createApp },
    { provide: FIREBASE_AUTH, useFactory: createAuth },
    { provide: FIRESTORE, useFactory: createFirestoreLoader },
    { provide: FIREBASE_STORAGE, useFactory: createStorage },
  ]);
}

/**
 * Deletes Firestore's on-disk cache, then signs out, so the next person on the device cannot read
 * the previous user's documents. Firestore is unusable afterwards: reload the page. Clearing fails
 * with `failed-precondition` while another tab still has the app open; the user then stays signed
 * in, so sign-out never succeeds with their documents left on disk.
 */
export async function signOutAndClearCache(
  auth: Auth,
  loadFirestore: LoadFirestore,
): Promise<void> {
  const firestore = await loadFirestore();
  const { clearIndexedDbPersistence, terminate } = await import('firebase/firestore');
  await terminate(firestore);
  await clearIndexedDbPersistence(firestore);
  await signOut(auth);
}

function createApp(): FirebaseApp {
  const { options } = inject(FIREBASE_SETTINGS);
  if (options.projectId?.startsWith('REPLACE_ME')) {
    throw new Error(
      'Firebase web config is a placeholder. Paste it into src/environments/environment.ts.',
    );
  }
  const app = initializeApp(options);
  // Free the default app name when the injector goes away, so a new injector can initialise it again.
  inject(DestroyRef).onDestroy(() => void deleteApp(app));
  return app;
}

function createAuth(): Auth {
  const { emulators } = inject(FIREBASE_SETTINGS);
  const auth = getAuth(inject(FIREBASE_APP));
  if (emulators) {
    connectAuthEmulator(auth, `http://${emulators.host}:${emulators.authPort}`);
  }
  return auth;
}

function createFirestoreLoader(): LoadFirestore {
  const { emulators, firestoreCache = 'persistent' } = inject(FIREBASE_SETTINGS);
  const app = inject(FIREBASE_APP);
  let pendingFirestore: Promise<Firestore> | undefined;
  const load = async (): Promise<Firestore> => {
    const sdk = await import('firebase/firestore');
    const instance = sdk.initializeFirestore(app, {
      localCache:
        firestoreCache === 'memory'
          ? sdk.memoryLocalCache()
          : sdk.persistentLocalCache({ tabManager: sdk.persistentMultipleTabManager() }),
    });
    if (emulators) {
      sdk.connectFirestoreEmulator(instance, emulators.host, emulators.firestorePort);
    }
    return instance;
  };
  return () =>
    (pendingFirestore ??= load().catch((error: unknown) => {
      // E.g. the chunk download failed offline: don't cache the failure, let the next call try again.
      pendingFirestore = undefined;
      throw error;
    }));
}

function createStorage(): FirebaseStorage {
  const { emulators } = inject(FIREBASE_SETTINGS);
  const storage = getStorage(inject(FIREBASE_APP));
  if (emulators) {
    connectStorageEmulator(storage, emulators.host, emulators.storagePort);
  }
  return storage;
}
