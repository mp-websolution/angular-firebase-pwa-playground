import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { signOut } from 'firebase/auth';
import { terminate } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { AuthSession } from '../../auth/auth-session';
import { FIREBASE_AUTH, FIRESTORE } from '../provide-firebase';

/**
 * `vi.waitFor` options for waiting on an emulator's answer: on a cold CI runner it can take
 * seconds, but `vi.waitFor` gives up after 1 s by default and Vitest has no setting to change that.
 */
export const slowEmulatorTimeout = { timeout: 5_000 };

/**
 * `beforeAll` for specs that read or write the app's Firestore data through the emulator, e.g.
 * with the rules disabled or to test them. Passes no rules: the emulator already runs
 * `firestore.rules`, the file that gets deployed. Finds the emulator through
 * `FIRESTORE_EMULATOR_HOST`, which `emulators:exec` sets. Call `cleanup()` on the result in
 * `afterAll`.
 */
export function testEnvironmentWithDeployedFirestoreRules(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: environment.firebase.options.projectId,
    firestore: {},
  });
}

/**
 * `beforeEach` for integration tests that give Firestore its persistent cache, which needs
 * IndexedDB. Importing this file installs an in-memory IndexedDB, since jsdom has none; calling it
 * turns on the switch without which Firestore's Node build, the one tests load, ignores IndexedDB.
 * Undo it with `vi.unstubAllEnvs()`, as `tearDownFirebase` does.
 */
export function enablePersistentCacheInJsdom(): void {
  vi.stubEnv('USE_MOCK_PERSISTENCE', 'YES');
}

/**
 * Signs a new user up through `AuthSession`, as the guards make sure before a page with Live data
 * loads. Resolves to the user's uid.
 */
export async function signInAsNewUser(): Promise<string> {
  const session = TestBed.inject(AuthSession);
  await session.signUpWithEmail({
    email: `user-${crypto.randomUUID()}@example.com`,
    password: 'correct-horse',
  });
  return session.user()!.uid;
}

/**
 * `afterEach` for integration tests that sign in: Auth keeps the signed-in user across app
 * instances, so it would leak into the next test.
 */
export async function signOutForTheNextTest(): Promise<void> {
  await signOut(TestBed.inject(FIREBASE_AUTH));
}

/**
 * `afterEach` for integration tests that use Auth and Firestore. Signs out, as
 * {@link signOutForTheNextTest} does, and waits for Firestore to shut down, since TestBed doesn't
 * and jsdom may be gone before it's done.
 */
export async function tearDownFirebase(): Promise<void> {
  await signOutForTheNextTest();
  await terminate(await TestBed.inject(FIRESTORE)());
  vi.unstubAllEnvs();
}
