// jsdom has no IndexedDB; Firestore's persistent cache needs one.
import 'fake-indexeddb/auto';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { signOut } from 'firebase/auth';
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
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIREBASE_AUTH, FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import { NotesData } from './notes-data';

// On a cold CI runner the emulator can take seconds to answer, but `vi.waitFor` gives up after 1 s.
const emulatorReply = { timeout: 5_000 };

describe('NotesData against the emulators', { timeout: 20_000 }, () => {
  let testEnv: RulesTestEnvironment;
  const reportError = vi.fn<(error: unknown) => void>();

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
    reportError.mockReset();
    // Tests load Firestore's Node build, which only uses IndexedDB with its own test switch on.
    vi.stubEnv('USE_MOCK_PERSISTENCE', 'YES');
    TestBed.configureTestingModule({
      providers: [
        provideFirebase(environment.firebase),
        { provide: RELOAD_PAGE, useValue: vi.fn() },
        { provide: ErrorHandler, useValue: { handleError: reportError } },
      ],
    });
  });

  afterEach(async () => {
    // Auth keeps the signed-in user across app instances; don't let it leak into the next test.
    await signOut(TestBed.inject(FIREBASE_AUTH));
    vi.unstubAllEnvs();
  });

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

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), emulatorReply);
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
      emulatorReply,
    );
  });

  it('creates a note on top of the list and syncs it to the server', async () => {
    const uid = await signUp();
    await storeNote(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), emulatorReply);

    await notesData.create('Call Grace');

    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      emulatorReply,
    );
    await vi.waitFor(
      async () => expect(await storedTexts(uid)).toEqual(['Buy milk', 'Call Grace']),
      emulatorReply,
    );
  });

  it("changes a note's text and syncs it to the server", async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), emulatorReply);

    await notesData.update('milk', 'Buy oat milk');

    await vi.waitFor(
      () => expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]),
      emulatorReply,
    );
    await vi.waitFor(
      async () => expect(await storedTexts(uid)).toEqual(['Buy oat milk']),
      emulatorReply,
    );
  });

  it('deletes a note and syncs it to the server', async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), emulatorReply);

    await notesData.delete('milk');

    await vi.waitFor(() => expect(notesData.notes()).toEqual([]), emulatorReply);
    await vi.waitFor(async () => expect(await storedTexts(uid)).toEqual([]), emulatorReply);
  });

  it('shows notes added, changed and deleted elsewhere, e.g. on another device', async () => {
    const uid = await signUp();
    await storeNote(uid, 'milk', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), emulatorReply);

    await storeNote(uid, 'grace', 'Call Grace', new Date('2026-01-02'));
    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      emulatorReply,
    );

    await storeNote(uid, 'milk', 'Buy oat milk', new Date('2026-01-01'));
    await vi.waitFor(
      () =>
        expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy oat milk']),
      emulatorReply,
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), 'users', uid, 'notes', 'grace'));
    });
    await vi.waitFor(
      () => expect(notesData.notes()).toEqual([{ id: 'milk', text: 'Buy oat milk' }]),
      emulatorReply,
    );
  });

  it('shows a note created offline straight away and syncs it once back online', async () => {
    const uid = await signUp();
    await storeNote(uid, 'older', 'Buy milk', new Date('2026-01-01'));
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toHaveLength(1), emulatorReply);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await notesData.create('Call Grace');

    await vi.waitFor(
      () => expect(notesData.notes()?.map(({ text }) => text)).toEqual(['Call Grace', 'Buy milk']),
      emulatorReply,
    );

    await enableNetwork(firestore);

    await vi.waitFor(
      async () => expect(await storedTexts(uid)).toEqual(['Buy milk', 'Call Grace']),
      emulatorReply,
    );
    expect(reportError).not.toHaveBeenCalled();
  });

  it('reports no failure when sign-out shuts Firestore down', async () => {
    await signUp();
    const notesData = TestBed.inject(NotesData);
    await vi.waitFor(() => expect(notesData.notes()).toBeDefined(), emulatorReply);

    await TestBed.inject(AuthSession).signOut();
    // Firestore tells listeners about the shutdown asynchronously; give it the chance.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(notesData.loadFailed()).toBe(false);
    expect(reportError).not.toHaveBeenCalled();
  });
});
