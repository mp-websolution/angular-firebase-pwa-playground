import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Timestamp, collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { provideFirebase } from '../firebase/provide-firebase';
import { tearDownFirebase } from '../firebase/testing/tear-down-firebase';
import { NotesData } from './notes-data';
import { enablePersistentCacheInJsdom } from '../firebase/testing/persistent-cache-in-jsdom';
import { slowEmulatorTimeout } from '../firebase/testing/slow-emulator';

describe('NotesData against the emulators', { timeout: 20_000 }, () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    // Writes notes as another device would, past the rules. Finds the emulator through
    // FIRESTORE_EMULATOR_HOST, set by `emulators:exec`.
    testEnv = await initializeTestEnvironment({
      projectId: environment.firebase.options.projectId,
      firestore: {},
    });
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

  /** Signs a new user in, as the guard makes sure before the notes page loads. */
  async function signUp(): Promise<string> {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({
      email: `notes-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse',
    });
    return session.user()!.uid;
  }

  /** Stores a note past the rules, as if written on another device. */
  async function storeNote(uid: string, id: string, text: string, createdAt: Date): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'users', uid, 'notes', id), {
        text,
        createdAt: Timestamp.fromDate(createdAt),
      });
    });
  }

  /** The texts the server has, read past the rules. */
  async function storedTexts(uid: string): Promise<string[]> {
    let texts: string[] = [];
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snapshot = await getDocs(collection(context.firestore(), 'users', uid, 'notes'));
      texts = snapshot.docs.map((note) => note.get('text'));
    });
    return texts.sort();
  }

  it('has no notes for a new user', async () => {
    await signUp();

    const notesData = TestBed.inject(NotesData);

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), slowEmulatorTimeout);
  });

  it("lists the signed-in user's notes, newest first", async () => {
    const uid = await signUp();
    await storeNote(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    await storeNote(uid, 'newer', 'Call Grace', new Date('2026-01-02'));

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
    const uid = await signUp();
    await storeNote(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.create('Call Grace');

    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () => expect(await storedTexts(uid)).toEqual(['Buy milk', 'Call Grace']),
      slowEmulatorTimeout,
    );
  });

  it("changes a note's text and syncs it to the server", async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.update('milk', 'Buy oat milk');

    await vi.waitFor(
      () => expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () => expect(await storedTexts(uid)).toEqual(['Buy oat milk']),
      slowEmulatorTimeout,
    );
  });

  it('deletes a note and syncs it to the server', async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await notesData.delete('milk');

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), slowEmulatorTimeout);
    await vi.waitFor(async () => expect(await storedTexts(uid)).toEqual([]), slowEmulatorTimeout);
  });

  it('shows notes added, changed and deleted elsewhere, e.g. on another device', async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), slowEmulatorTimeout);

    await storeNote(uid, 'grace', 'Call Grace', new Date('2026-01-02'));
    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      slowEmulatorTimeout,
    );

    await storeNote(uid, 'milk', 'Buy oat milk', new Date('2026-01-01'));
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
