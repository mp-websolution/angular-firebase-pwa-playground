import 'fake-indexeddb/auto';

/**
 * `beforeEach` for integration tests that give Firestore its persistent cache, which needs
 * IndexedDB. Importing this file installs an in-memory IndexedDB, since jsdom has none; calling it
 * turns on the switch without which Firestore's Node build, the one tests load, ignores IndexedDB.
 * Undo it with `vi.unstubAllEnvs()`, as `tearDownFirebase` does.
 */
export function enablePersistentCacheInJsdom(): void {
  vi.stubEnv('USE_MOCK_PERSISTENCE', 'YES');
}
