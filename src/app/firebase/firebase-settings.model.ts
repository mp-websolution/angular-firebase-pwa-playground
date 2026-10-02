import type { FirebaseOptions } from 'firebase/app';

export interface FirebaseEmulators {
  host: string;
  authPort: number;
  firestorePort: number;
  storagePort: number;
}

export interface FirebaseSettings {
  options: FirebaseOptions;
  /** When set, Auth, Firestore and Storage talk to these emulators instead of Firebase. */
  emulators?: FirebaseEmulators;
  /** Defaults to `persistent` (IndexedDB, multi-tab). Use `memory` where IndexedDB is unavailable. */
  firestoreCache?: 'persistent' | 'memory';
}
