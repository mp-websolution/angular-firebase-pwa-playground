import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import { tearDownFirebase } from '../firebase/testing/tear-down-firebase';
import { testEnvironmentWithDeployedFirestoreRules } from '../firebase/testing/deployed-firestore-rules';
import { signInAsNewUser } from '../firebase/testing/sign-in-as-new-user';
import { NotesData } from './notes-data';
import { enablePersistentCacheInJsdom } from '../firebase/testing/persistent-cache-in-jsdom';
import { slowEmulatorTestTimeout, slowEmulatorTimeout } from '../firebase/testing/slow-emulator';

describe('NotesData against the emulators', slowEmulatorTestTimeout, () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedFirestoreRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    enablePersistentCacheInJsdom();
    TestBed.configureTestingModule({
      providers: [
        provideFirebase(environment.firebase),
        { provide: RELOAD_PAGE, useValue: vi.fn() },
        { provide: ErrorHandler, useValue: { handleError: vi.fn() } },
      ],
    });
  });

  afterEach(tearDownFirebase);

  async function storeNoteAsAnotherDevicePastTheRules(
    uid: string,
    id: string,
    text: string,
    createdAt: Date,
  ): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', uid, 'notes', id), {
        text,
        createdAt: Timestamp.fromDate(createdAt),
      });
    });
  }

  async function textsOnTheServerPastTheRules(uid: string): Promise<string[]> {
    let texts: string[] = [];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocs(collection(context.firestore(), 'users', uid, 'notes'));
      texts = snapshot.docs.map((note) => note.get('text'));
    });
    return texts.sort();
  }

  it('has no list until the notes have loaded, then an empty one for a new user', async () => {
    await signInAsNewUser();

    const notesData = TestBed.inject(NotesData);

    expect(notesData.notes()).toBeUndefined();
    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), slowEmulatorTimeout);
  });

  it("lists the signed-in user's notes, newest first", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    await storeNoteAsAnotherDevicePastTheRules(uid, 'newer', 'Call Grace', new Date('2026-01-02'));

    const notesData = TestBed.inject(NotesData);

    await vi.waitFor(
      () =>
        expect(notesData.notes()).toEqual([
          { id: 'newer', text: 'Call Grace' },
          { id: 'older', text: 'Buy milk' },
        ]),
      slowEmulatorTimeout,
    );
  });

  it('creates a note on top of the list and syncs it to the server', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.create('Call Grace');

    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () =>
        expect(await textsOnTheServerPastTheRules(uid)).toEqual(['Buy milk', 'Call Grace']),
      slowEmulatorTimeout,
    );
  });

  it("changes a note's text and syncs it to the server", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.update('milk', 'Buy oat milk');

    await vi.waitFor(
      () => expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () => expect(await textsOnTheServerPastTheRules(uid)).toEqual(['Buy oat milk']),
      slowEmulatorTimeout,
    );
  });

  it('deletes a note and syncs it to the server', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.delete('milk');

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), slowEmulatorTimeout);
    await vi.waitFor(
      async () => expect(await textsOnTheServerPastTheRules(uid)).toEqual([]),
      slowEmulatorTimeout,
    );
  });

  it('creates a note offline, on top of the list while its creation time waits for the server, and syncs it once back online', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'newer', 'Buy milk', new Date('2999-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await notesData.create('Call Grace');

    await vi.waitFor(() => {
      expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']);
      expect(notesData.waitingToSync()).toBe(true);
    }, slowEmulatorTimeout);

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(notesData.waitingToSync()).toBe(false), slowEmulatorTimeout);
    expect(await textsOnTheServerPastTheRules(uid)).toEqual(['Buy milk', 'Call Grace']);
  });

  it("changes a note's text offline straight away and syncs it once back online", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await notesData.update('milk', 'Buy oat milk');

    await vi.waitFor(() => {
      expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]);
      expect(notesData.waitingToSync()).toBe(true);
    }, slowEmulatorTimeout);

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(notesData.waitingToSync()).toBe(false), slowEmulatorTimeout);
    expect(await textsOnTheServerPastTheRules(uid)).toEqual(['Buy oat milk']);
  });

  it('deletes a note offline straight away and syncs it once back online', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await notesData.delete('milk');

    await vi.waitFor(() => {
      expect(notesData.notes()).toEqual([]);
      expect(notesData.waitingToSync()).toBe(true);
    }, slowEmulatorTimeout);

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(notesData.waitingToSync()).toBe(false), slowEmulatorTimeout);
    expect(await textsOnTheServerPastTheRules(uid)).toEqual([]);
  });

  it('shows notes added, changed and deleted elsewhere, e.g. on another device', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await storeNoteAsAnotherDevicePastTheRules(uid, 'grace', 'Call Grace', new Date('2026-01-02'));
    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      slowEmulatorTimeout,
    );

    await storeNoteAsAnotherDevicePastTheRules(uid, 'milk', 'Buy oat milk', new Date('2026-01-01'));
    await vi.waitFor(
      () =>
        expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy oat milk']),
      slowEmulatorTimeout,
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), 'users', uid, 'notes', 'grace'));
    });
    await vi.waitFor(
      () => expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]),
      slowEmulatorTimeout,
    );
  });
});
