import {
  DestroyRef,
  EnvironmentProviders,
  InjectionToken,
  inject,
  makeEnvironmentProviders,
} from '@angular/core';
import { FirebaseApp, deleteApp, initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth, signOut } from 'firebase/auth';
// Type-only: a value import would pull the Firestore SDK into the initial bundle.
import type { Firestore } from 'firebase/firestore';
import { FirebaseStorage, connectStorageEmulator, getStorage } from 'firebase/storage';
import type { FirebaseSettings } from './firebase-settings.model';

const FIREBASE_SETTINGS = new InjectionToken<FirebaseSettings>('FIREBASE_SETTINGS');
const FIREBASE_APP = new InjectionToken<FirebaseApp>('FIREBASE_APP');

/**
 * Loads the Firestore SDK and initialises Firestore on the first call; later calls share it, and a
 * failed load is tried again. The SDK is most of Firebase's weight, so it stays out of the initial
 * bundle (ADR 0003).
 */
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
 * Deletes Firestore's on-disk cache, then signs out, so the next person on the device can't read
 * the previous user's documents; if deleting fails, the user stays signed in. Other tabs shut
 * their Firestore down too. Firestore is unusable afterwards: reload the page.
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
  const forgetTheFailureSoTheNextCallRetries = (error: unknown): never => {
    pendingFirestore = undefined;
    throw error;
  };
  return () => (pendingFirestore ??= load().catch(forgetTheFailureSoTheNextCallRetries));
}

function createStorage(): FirebaseStorage {
  const { emulators } = inject(FIREBASE_SETTINGS);
  const storage = getStorage(inject(FIREBASE_APP));
  if (emulators) {
    connectStorageEmulator(storage, emulators.host, emulators.storagePort);
  }
  return storage;
}
