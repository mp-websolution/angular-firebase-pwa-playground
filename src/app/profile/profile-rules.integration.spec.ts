import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';

describe('Firestore rules for profiles', () => {
  let testEnv: RulesTestEnvironment;
  let ada: string;
  let grace: string;

  beforeAll(async () => {
    // No rules passed: the emulator already runs firestore.rules, the file that gets deployed.
    // `emulators:exec` tells it where the Firestore emulator is (FIRESTORE_EMULATOR_HOST).
    testEnv = await initializeTestEnvironment({
      projectId: environment.firebase.options.projectId,
      firestore: {},
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Fresh users per test, so tests never see each other's profiles.
    ada = `ada-${crypto.randomUUID()}`;
    grace = `grace-${crypto.randomUUID()}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', ada), { displayName: 'Ada' });
    });
  });

  function profileAs(uid: string | null, profileUid: string) {
    const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
    return doc(context.firestore(), 'profiles', profileUid);
  }

  it('lets users read their own profile', async () => {
    await assertSucceeds(getDoc(profileAs(ada, ada)));
  });

  it('lets users create and change their own profile', async () => {
    await assertSucceeds(setDoc(profileAs(grace, grace), { displayName: 'Grace' }));
    await assertSucceeds(updateDoc(profileAs(ada, ada), { displayName: 'Ada L.' }));
  });

  it('lets users delete their own profile', async () => {
    await assertSucceeds(deleteDoc(profileAs(ada, ada)));
  });

  it("keeps other users from reading or changing someone's profile", async () => {
    await assertFails(getDoc(profileAs(grace, ada)));
    await assertFails(setDoc(profileAs(grace, ada), { displayName: 'Grace' }));
    await assertFails(deleteDoc(profileAs(grace, ada)));
  });

  it('keeps signed-out visitors from reading or changing profiles', async () => {
    await assertFails(getDoc(profileAs(null, ada)));
    await assertFails(setDoc(profileAs(null, ada), { displayName: 'Nobody' }));
  });

  it('rejects a blank or too long display name', async () => {
    await assertFails(setDoc(profileAs(ada, ada), { displayName: '' }));
    await assertFails(setDoc(profileAs(ada, ada), { displayName: 'x'.repeat(51) }));
    await assertFails(setDoc(profileAs(ada, ada), { displayName: 42 }));
  });

  it('accepts a display name of exactly 50 characters', async () => {
    await assertSucceeds(setDoc(profileAs(ada, ada), { displayName: 'x'.repeat(50) }));
  });

  it('rejects fields a profile does not have', async () => {
    await assertFails(setDoc(profileAs(ada, ada), { displayName: 'Ada', admin: true }));
  });

  it('denies collections that no rule opens', async () => {
    const context = testEnv.authenticatedContext(ada);
    await assertFails(getDoc(doc(context.firestore(), 'secrets', ada)));
  });
});
