import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { testEnvironmentWithDeployedFirestoreRules } from '../firebase/testing/deployed-firestore-rules';

describe('Firestore rules for notes', () => {
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
    // Fresh users per test, so tests never see each other's notes.
    ada = `ada-${crypto.randomUUID()}`;
    grace = `grace-${crypto.randomUUID()}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', ada, 'notes', 'note-1'), {
        text: 'Buy milk',
        createdAt: Timestamp.now(),
      });
    });
  });

  /** `ownerUid`'s notes, as `uid` sees them (`null`: signed out). */
  function notesAs(uid: string | null, ownerUid: string) {
    const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
    return collection(context.firestore(), 'users', ownerUid, 'notes');
  }

  function noteAs(uid: string | null, ownerUid: string, noteId = 'note-1') {
    return doc(notesAs(uid, ownerUid), noteId);
  }

  it('lets users read and list their own notes', async () => {
    await assertSucceeds(getDoc(noteAs(ada, ada)));
    await assertSucceeds(getDocs(notesAs(ada, ada)));
  });

  it('lets users create, change and delete their own notes', async () => {
    await assertSucceeds(
      setDoc(noteAs(ada, ada, 'note-2'), { text: 'Call Grace', createdAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(noteAs(ada, ada), { text: 'Buy oat milk' }));
    await assertSucceeds(deleteDoc(noteAs(ada, ada)));
  });

  it("keeps other users from reading or changing someone's notes", async () => {
    await assertFails(getDoc(noteAs(grace, ada)));
    await assertFails(getDocs(notesAs(grace, ada)));
    await assertFails(
      setDoc(noteAs(grace, ada, 'note-2'), { text: 'Hi Ada', createdAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(noteAs(grace, ada), { text: 'Buy oat milk' }));
    await assertFails(deleteDoc(noteAs(grace, ada)));
  });

  it('keeps signed-out visitors from reading or changing notes', async () => {
    await assertFails(getDoc(noteAs(null, ada)));
    await assertFails(getDocs(notesAs(null, ada)));
    await assertFails(
      setDoc(noteAs(null, ada, 'note-2'), { text: 'Hi Ada', createdAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(noteAs(null, ada), { text: 'Buy oat milk' }));
    await assertFails(deleteDoc(noteAs(null, ada)));
  });

  // Each bad text is tried on a new note and on an existing one.
  it.each([
    ['is blank', '   '],
    ['is longer than 1000 characters', 'x'.repeat(1001)],
    ['has surrounding spaces', ' Buy milk '],
    ['is not text', 42],
  ])('rejects a text that %s', async (_case, text) => {
    await assertFails(setDoc(noteAs(ada, ada, 'note-2'), { text, createdAt: serverTimestamp() }));
    await assertFails(updateDoc(noteAs(ada, ada), { text }));
  });

  it('accepts texts of 1 and of 1000 characters', async () => {
    await assertSucceeds(
      setDoc(noteAs(ada, ada, 'note-2'), { text: 'x', createdAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(noteAs(ada, ada), { text: 'x'.repeat(1000) }));
  });

  it('takes the creation time from the server only', async () => {
    await assertFails(
      setDoc(noteAs(ada, ada, 'note-2'), { text: 'Call Grace', createdAt: Timestamp.now() }),
    );
    await assertFails(setDoc(noteAs(ada, ada, 'note-2'), { text: 'Call Grace' }));
    await assertFails(updateDoc(noteAs(ada, ada), { createdAt: serverTimestamp() }));
  });

  it('rejects fields a note does not have', async () => {
    await assertFails(
      setDoc(noteAs(ada, ada, 'note-2'), {
        text: 'Call Grace',
        createdAt: serverTimestamp(),
        pinned: true,
      }),
    );
    await assertFails(updateDoc(noteAs(ada, ada), { pinned: true }));
  });
});
