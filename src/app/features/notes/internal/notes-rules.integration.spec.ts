import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { testEnvironmentWithDeployedFirestoreRules } from '../../../testing/emulator-setup';

describe('Firestore rules for notes', () => {
  let testEnv: RulesTestEnvironment;
  let ada: string;
  let grace: string;
  let adasNote: string;
  let newNote: string;

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedFirestoreRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    ada = `ada-${crypto.randomUUID()}`;
    grace = `grace-${crypto.randomUUID()}`;
    adasNote = `note-${crypto.randomUUID()}`;
    newNote = `note-${crypto.randomUUID()}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notes', adasNote), {
        text: 'Buy milk',
        authorUid: ada,
        createdAt: Timestamp.now(),
      });
    });
  });

  function notesAs(uid: string | null) {
    const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
    return collection(context.firestore(), 'notes');
  }

  function noteAs(uid: string | null, noteId = adasNote) {
    return doc(notesAs(uid), noteId);
  }

  it.each([
    ['its author', () => ada],
    ['other users', () => grace],
    ['signed-out visitors', () => null],
  ])("lets %s read and list every note, and one author's notes", async (_case, reader) => {
    await assertSucceeds(getDoc(noteAs(reader())));
    await assertSucceeds(getDocs(notesAs(reader())));
    await assertSucceeds(getDocs(query(notesAs(reader()), where('authorUid', '==', ada))));
  });

  it('lets signed-in users create notes as their author', async () => {
    await assertSucceeds(
      setDoc(noteAs(grace, newNote), {
        text: 'Call Ada',
        authorUid: grace,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('rejects a new note whose author is someone else', async () => {
    await assertFails(
      setDoc(noteAs(grace, newNote), {
        text: 'Call Ada',
        authorUid: ada,
        createdAt: serverTimestamp(),
      }),
    );
  });

  it('rejects a new note without an author', async () => {
    await assertFails(
      setDoc(noteAs(grace, newNote), { text: 'Call Ada', createdAt: serverTimestamp() }),
    );
  });

  it('keeps signed-out visitors from creating notes', async () => {
    await assertFails(
      setDoc(noteAs(null, newNote), { text: 'Hi', authorUid: ada, createdAt: serverTimestamp() }),
    );
  });

  it('lets authors change and delete their own notes', async () => {
    await assertSucceeds(updateDoc(noteAs(ada), { text: 'Buy oat milk' }));
    await assertSucceeds(deleteDoc(noteAs(ada)));
  });

  it("keeps other users and signed-out visitors from changing or deleting someone's note", async () => {
    await assertFails(updateDoc(noteAs(grace), { text: 'Buy oat milk' }));
    await assertFails(deleteDoc(noteAs(grace)));
    await assertFails(updateDoc(noteAs(null), { text: 'Buy oat milk' }));
    await assertFails(deleteDoc(noteAs(null)));
  });

  it('keeps authors from handing a note to someone else', async () => {
    await assertFails(updateDoc(noteAs(ada), { authorUid: grace }));
  });

  it.each([
    ['is blank', '   '],
    ['is longer than 1000 characters', 'x'.repeat(1001)],
    ['has surrounding spaces', ' Buy milk '],
    ['is not text', 42],
  ])('rejects a text that %s, on a new note and on an existing one', async (_case, text) => {
    await assertFails(
      setDoc(noteAs(ada, newNote), { text, authorUid: ada, createdAt: serverTimestamp() }),
    );
    await assertFails(updateDoc(noteAs(ada), { text }));
  });

  it('accepts texts of 1 and of 1000 characters', async () => {
    await assertSucceeds(
      setDoc(noteAs(ada, newNote), { text: 'x', authorUid: ada, createdAt: serverTimestamp() }),
    );
    await assertSucceeds(updateDoc(noteAs(ada), { text: 'x'.repeat(1000) }));
  });

  it('takes the creation time from the server only', async () => {
    await assertFails(
      setDoc(noteAs(ada, newNote), {
        text: 'Call Grace',
        authorUid: ada,
        createdAt: Timestamp.now(),
      }),
    );
    await assertFails(setDoc(noteAs(ada, newNote), { text: 'Call Grace', authorUid: ada }));
    await assertFails(updateDoc(noteAs(ada), { createdAt: serverTimestamp() }));
  });

  it('rejects fields a note does not have', async () => {
    await assertFails(
      setDoc(noteAs(ada, newNote), {
        text: 'Call Grace',
        authorUid: ada,
        createdAt: serverTimestamp(),
        pinned: true,
      }),
    );
    await assertFails(updateDoc(noteAs(ada), { pinned: true }));
  });
});
