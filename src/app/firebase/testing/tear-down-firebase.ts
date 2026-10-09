import { TestBed } from '@angular/core/testing';
import { signOut } from 'firebase/auth';
import { terminate } from 'firebase/firestore';
import { FIREBASE_AUTH, FIRESTORE } from '../provide-firebase';

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
