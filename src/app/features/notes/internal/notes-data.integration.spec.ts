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
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { environment } from '../../../../environments/environment';
import { RELOAD_PAGE } from '../../../browser/reload-page';
import { FIRESTORE, provideFirebase } from '../../../firebase/provide-firebase';
import {
  enablePersistentCacheInJsdom,
  signInAsNewUser,
  slowEmulatorTimeout,
  tearDownFirebase,
  testEnvironmentWithDeployedFirestoreRules,
} from '../../../testing/emulator-setup';
import { NotesData } from './notes-data';

describe('NotesData against the emulators', () => {
  let testEnv: RulesTestEnvironment;
  let run: string;

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedFirestoreRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    run = crypto.randomUUID();
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

  function idInThisTest(name: string): string {
    return `${name}-${run}`;
  }

  async function storeNoteAsAnotherDeviceWithDisabledRules(
    authorUid: string,
    name: string,
    text: string,
    createdAt: Date,
  ): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notes', idInThisTest(name)), {
        text,
        authorUid,
        createdAt: Timestamp.fromDate(createdAt),
      });
    });
  }

  async function textsOnTheServerWithDisabledRules(authorUid: string): Promise<string[]> {
    let texts: string[] = [];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocs(
        query(collection(context.firestore(), 'notes'), where('authorUid', '==', authorUid)),
      );
      texts = snapshot.docs.map((note) => note.get('text'));
    });
    return texts.sort();
  }

  function notesOfThisTest(notesData: NotesData) {
    return notesData.notes()?.filter(({ id }) => id.endsWith(run));
  }

  async function injectNotesDataShowingMine(): Promise<NotesData> {
    const notesData = TestBed.inject(NotesData);
    notesData.setFilter('mine');
    await vi.waitFor(() => expect(notesData.loading()).toBe(false), slowEmulatorTimeout);
    return notesData;
  }

  it('has no list until the notes have loaded, then lists every note', async () => {
    const notesData = TestBed.inject(NotesData);

    expect(notesData.notes()).toBeUndefined();
    expect(notesData.loading()).toBe(true);
    await vi.waitFor(() => expect(notesData.notes()).toBeInstanceOf(Array), slowEmulatorTimeout);
    expect(notesData.loading()).toBe(false);
  });

  it("lists everyone's notes to signed-out visitors, newest first, none of them theirs", async () => {
    await storeNoteAsAnotherDeviceWithDisabledRules(
      'ada',
      'older',
      'Buy milk',
      new Date('2026-01-01'),
    );
    await storeNoteAsAnotherDeviceWithDisabledRules(
      'grace',
      'newer',
      'Call Ada',
      new Date('2026-01-02'),
    );

    const notesData = TestBed.inject(NotesData);

    await vi.waitFor(
      () =>
        expect(notesOfThisTest(notesData)).toEqual([
          { id: idInThisTest('newer'), text: 'Call Ada', mine: false },
          { id: idInThisTest('older'), text: 'Buy milk', mine: false },
        ]),
      slowEmulatorTimeout,
    );
  });

  it("marks a note with no author, e.g. one an admin wrote, as nobody's to a signed-out visitor", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'notes', idInThisTest('authorless')), {
        text: 'Welcome',
        createdAt: Timestamp.fromDate(new Date('2026-01-01')),
      });
    });

    const notesData = TestBed.inject(NotesData);

    await vi.waitFor(
      () =>
        expect(notesOfThisTest(notesData)).toEqual([
          { id: idInThisTest('authorless'), text: 'Welcome', mine: false },
        ]),
      slowEmulatorTimeout,
    );
  });

  it("marks the signed-in user's own notes among everyone's", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'mine',
      'Buy milk',
      new Date('2026-01-01'),
    );
    await storeNoteAsAnotherDeviceWithDisabledRules(
      'grace',
      'graces',
      'Call Ada',
      new Date('2026-01-02'),
    );

    const notesData = TestBed.inject(NotesData);

    await vi.waitFor(
      () =>
        expect(notesOfThisTest(notesData)).toEqual([
          { id: idInThisTest('graces'), text: 'Call Ada', mine: false },
          { id: idInThisTest('mine'), text: 'Buy milk', mine: true },
        ]),
      slowEmulatorTimeout,
    );
    expect(notesData.filter()).toBe('all');
  });

  it("lists only the signed-in user's notes, newest first, once switched to mine", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'older',
      'Buy milk',
      new Date('2026-01-01'),
    );
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'newer',
      'Call Grace',
      new Date('2026-01-03'),
    );
    await storeNoteAsAnotherDeviceWithDisabledRules(
      'grace',
      'graces',
      'Call Ada',
      new Date('2026-01-02'),
    );
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesOfThisTest(notesData)).toHaveLength(3), slowEmulatorTimeout);

    notesData.setFilter('mine');

    expect(notesData.filter()).toBe('mine');
    await vi.waitFor(
      () =>
        expect(notesData.notes()).toEqual([
          { id: idInThisTest('newer'), text: 'Call Grace', mine: true },
          { id: idInThisTest('older'), text: 'Buy milk', mine: true },
        ]),
      slowEmulatorTimeout,
    );
    expect(notesData.loading()).toBe(false);
  });

  it('lists everyone again once switched back to all', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'mine',
      'Buy milk',
      new Date('2026-01-01'),
    );
    await storeNoteAsAnotherDeviceWithDisabledRules(
      'grace',
      'graces',
      'Call Ada',
      new Date('2026-01-02'),
    );
    const notesData = await injectNotesDataShowingMine();
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    notesData.setFilter('all');

    await vi.waitFor(
      () =>
        expect(notesOfThisTest(notesData)?.map(({ text }) => text)).toEqual([
          'Call Ada',
          'Buy milk',
        ]),
      slowEmulatorTimeout,
    );
  });

  it('creates a note by the signed-in user on top of the list and syncs it to the server', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'older',
      'Buy milk',
      new Date('2026-01-01'),
    );
    const notesData = await injectNotesDataShowingMine();
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.create('Call Grace');

    await vi.waitFor(
      () =>
        expect(notesData.notes()?.map(({ text, mine }) => [text, mine])).toEqual([
          ['Call Grace', true],
          ['Buy milk', true],
        ]),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () =>
        expect(await textsOnTheServerWithDisabledRules(uid)).toEqual(['Buy milk', 'Call Grace']),
      slowEmulatorTimeout,
    );
  });

  it("changes a note's text and syncs it to the server", async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'milk',
      'Buy milk',
      new Date('2026-01-01'),
    );
    const notesData = await injectNotesDataShowingMine();
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.update(idInThisTest('milk'), 'Buy oat milk');

    await vi.waitFor(
      () =>
        expect(notesData.notes()).toEqual([
          { id: idInThisTest('milk'), text: 'Buy oat milk', mine: true },
        ]),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () => expect(await textsOnTheServerWithDisabledRules(uid)).toEqual(['Buy oat milk']),
      slowEmulatorTimeout,
    );
  });

  it('deletes a note and syncs it to the server', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'milk',
      'Buy milk',
      new Date('2026-01-01'),
    );
    const notesData = await injectNotesDataShowingMine();
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.delete(idInThisTest('milk'));

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), slowEmulatorTimeout);
    await vi.waitFor(
      async () => expect(await textsOnTheServerWithDisabledRules(uid)).toEqual([]),
      slowEmulatorTimeout,
    );
  });

  it('lists a note created offline on top while its creation time waits for the server', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'far-future',
      'Buy milk',
      new Date('2999-01-01'),
    );
    const notesData = await injectNotesDataShowingMine();
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
    expect(await textsOnTheServerWithDisabledRules(uid)).toEqual(['Buy milk', 'Call Grace']);
  });

  it('shows notes added, changed and deleted elsewhere, e.g. on another device', async () => {
    const uid = await signInAsNewUser();
    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'milk',
      'Buy milk',
      new Date('2026-01-01'),
    );
    const notesData = await injectNotesDataShowingMine();
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'grace',
      'Call Grace',
      new Date('2026-01-02'),
    );
    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      slowEmulatorTimeout,
    );

    await storeNoteAsAnotherDeviceWithDisabledRules(
      uid,
      'milk',
      'Buy oat milk',
      new Date('2026-01-01'),
    );
    await vi.waitFor(
      () =>
        expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy oat milk']),
      slowEmulatorTimeout,
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), 'notes', idInThisTest('grace')));
    });
    await vi.waitFor(
      () =>
        expect(notesData.notes()).toEqual([
          { id: idInThisTest('milk'), text: 'Buy oat milk', mine: true },
        ]),
      slowEmulatorTimeout,
    );
  });
});
