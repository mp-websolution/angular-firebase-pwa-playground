import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { testEnvironmentWithDeployedFirestoreRules } from '../firebase/testing/deployed-firestore-rules';

function uidNoOtherTestUses(name: string) {
  return `${name}-${crypto.randomUUID()}`;
}

describe('Firestore rules for profiles', () => {
  let testEnv: RulesTestEnvironment;
  let ada: string;
  let grace: string;

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedFirestoreRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    ada = uidNoOtherTestUses('ada');
    grace = uidNoOtherTestUses('grace');
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
    await assertFails(deleteDoc(profileAs(null, ada)));
  });

  it.each([
    ['is blank', '   '],
    ['is shorter than 2 characters', 'A'],
    ['is longer than 50 characters', 'x'.repeat(51)],
    ['has surrounding spaces', ' Ada '],
    ['is not text', 42],
  ])(
    'rejects a display name that %s, on a new profile and on an existing one',
    async (_case, displayName) => {
      await assertFails(setDoc(profileAs(grace, grace), { displayName }));
      await assertFails(updateDoc(profileAs(ada, ada), { displayName }));
    },
  );

  it('accepts display names of 2 and of 50 characters', async () => {
    await assertSucceeds(setDoc(profileAs(grace, grace), { displayName: 'Gr' }));
    await assertSucceeds(updateDoc(profileAs(ada, ada), { displayName: 'x'.repeat(50) }));
  });

  it('lets users record their avatar URL alongside their display name', async () => {
    const avatarUrl =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fada?alt=media';
    await assertSucceeds(setDoc(profileAs(grace, grace), { displayName: 'Grace', avatarUrl }));
    await assertSucceeds(updateDoc(profileAs(ada, ada), { avatarUrl }));
  });

  it('rejects an avatar URL on a profile without a display name', async () => {
    const avatarUrl =
      'https://firebasestorage.googleapis.com/v0/b/bucket/o/avatars%2Fgrace?alt=media';
    await assertFails(setDoc(profileAs(grace, grace), { avatarUrl }));
  });

  it('rejects an avatar URL that is not text', async () => {
    await assertFails(setDoc(profileAs(grace, grace), { displayName: 'Grace', avatarUrl: 42 }));
    await assertFails(updateDoc(profileAs(ada, ada), { avatarUrl: 42 }));
  });

  it('rejects fields a profile does not have', async () => {
    await assertFails(setDoc(profileAs(grace, grace), { displayName: 'Grace', admin: true }));
    await assertFails(updateDoc(profileAs(ada, ada), { admin: true }));
  });

  it('denies collections that no rule opens', async () => {
    const context = testEnv.authenticatedContext(ada);
    await assertFails(getDoc(doc(context.firestore(), 'secrets', ada)));
  });
});
