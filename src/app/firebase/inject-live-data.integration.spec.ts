import {
  EnvironmentInjector,
  ErrorHandler,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  DocumentReference,
  collection,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { injectLiveData } from './inject-live-data';
import { FIRESTORE, provideFirebase } from './provide-firebase';
import { tearDownFirebase } from './testing/tear-down-firebase';
import { enablePersistentCacheInJsdom } from './testing/persistent-cache-in-jsdom';
import { slowEmulatorTimeout } from './testing/slow-emulator';

// Its own project, so these rules don't replace firestore.rules for the other integration tests.
const projectId = 'demo-live-data';

// Anything goes under a user's scratch path, except a write marked to be rejected. Every other
// path is denied, so it can't be loaded.
const rules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scratch/{uid}/{document=**} {
      allow read, delete: if true;
      allow create, update: if request.resource.data.get('rejected', false) != true;
    }
  }
}`;

describe('injectLiveData against the emulators', { timeout: 20_000 }, () => {
  let testEnv: RulesTestEnvironment;
  const reportError = vi.fn<(error: unknown) => void>();

  beforeAll(async () => {
    // Loads the rules, and writes data as another device would. Finds the emulator through
    // FIRESTORE_EMULATOR_HOST, set by `emulators:exec`.
    testEnv = await initializeTestEnvironment({ projectId, firestore: { rules } });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    reportError.mockReset();
    enablePersistentCacheInJsdom();
    const { firebase } = environment;
    TestBed.configureTestingModule({
      providers: [
        provideFirebase({ ...firebase, options: { ...firebase.options, projectId } }),
        { provide: RELOAD_PAGE, useValue: vi.fn() },
        { provide: ErrorHandler, useValue: { handleError: reportError } },
      ],
    });
  });

  afterEach(tearDownFirebase);

  /** Signs a new user in, as the guards make sure before a page with live data loads. */
  async function signUp(): Promise<string> {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({
      email: `live-data-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse',
    });
    return session.user()!.uid;
  }

  /** Writes past the rules, as if on another device. */
  async function storeElsewhere(path: string, data: Record<string, unknown>): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path), data);
    });
  }

  /** What the server has, read past the rules. */
  async function stored(path: string): Promise<unknown> {
    let data: unknown;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      data = (await getDoc(doc(context.firestore(), path))).data();
    });
    return data;
  }

  describe('of a document', () => {
    function injectSettings() {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          refFor: (firestore, uid) => doc(firestore, 'scratch', uid),
          map: (snapshot): string => snapshot.get('theme') ?? 'system',
        }),
      );
    }

    it('shows the stored document, and every change made elsewhere', async () => {
      const uid = await signUp();
      await storeElsewhere(`scratch/${uid}`, { theme: 'dark' });

      const settings = injectSettings();

      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);
      await storeElsewhere(`scratch/${uid}`, { theme: 'light' });
      await vi.waitFor(() => expect(settings.value()).toBe('light'), slowEmulatorTimeout);
      expect(settings.waitingToSync()).toBe(false);
      expect(settings.loadFailed()).toBe(false);
    });

    it('shows a tracked write straight away and syncs it to the server', async () => {
      const uid = await signUp();
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('system'), slowEmulatorTimeout);

      settings.track(setDoc(await settings.ref(), { theme: 'dark' }));

      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);
      expect(settings.waitingToSync()).toBe(false);
      await vi.waitFor(
        async () => expect(await stored(`scratch/${uid}`)).toEqual({ theme: 'dark' }),
        slowEmulatorTimeout,
      );
    });

    it('shows a write made offline straight away and syncs it once back online', async () => {
      const uid = await signUp();
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('system'), slowEmulatorTimeout);
      const firestore = await TestBed.inject(FIRESTORE)();
      await disableNetwork(firestore);

      settings.track(setDoc(await settings.ref(), { theme: 'dark' }));

      await vi.waitFor(() => {
        expect(settings.value()).toBe('dark');
        expect(settings.waitingToSync()).toBe(true);
      }, slowEmulatorTimeout);

      await enableNetwork(firestore);

      await vi.waitFor(() => expect(settings.waitingToSync()).toBe(false), slowEmulatorTimeout);
      expect(await stored(`scratch/${uid}`)).toEqual({ theme: 'dark' });
      expect(reportError).not.toHaveBeenCalled();
    });

    it('reports a write the server rejects, and shows what the server kept', async () => {
      const uid = await signUp();
      await storeElsewhere(`scratch/${uid}`, { theme: 'dark' });
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);

      settings.track(setDoc(await settings.ref(), { theme: 'light', rejected: true }));

      await vi.waitFor(
        () =>
          expect(reportError).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'permission-denied' }),
          ),
        slowEmulatorTimeout,
      );
      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);
      expect(settings.waitingToSync()).toBe(false);
      expect(settings.loadFailed()).toBe(false);
    });

    it('says when the data cannot be loaded, and reports why', async () => {
      await signUp();

      const forbidden = TestBed.runInInjectionContext(() =>
        injectLiveData({
          refFor: (firestore, uid) => doc(firestore, 'forbidden', uid),
          map: (snapshot) => snapshot.data(),
        }),
      );

      await vi.waitFor(() => expect(forbidden.loadFailed()).toBe(true), slowEmulatorTimeout);
      expect(forbidden.value()).toBeUndefined();
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'permission-denied' }),
      );
    });

    it('reports no failure once destroyed, even if the data then fails to load', async () => {
      await signUp();
      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
      const failing = runInInjectionContext(injector, () =>
        injectLiveData({
          refFor: (): DocumentReference => {
            throw new Error('Firestore failed to load.');
          },
          map: (snapshot) => snapshot.data(),
        }),
      );

      injector.destroy();
      await new Promise((resolve) => setTimeout(resolve));

      expect(failing.loadFailed()).toBe(false);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('reports no failure when sign-out shuts Firestore down', async () => {
      await signUp();
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('system'), slowEmulatorTimeout);

      await TestBed.inject(AuthSession).signOut();
      // Firestore tells listeners about the shutdown asynchronously; give it the chance.
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(settings.loadFailed()).toBe(false);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('needs a signed-in user', () => {
      expect(() => injectSettings()).toThrow('injectLiveData needs a signed-in user.');
    });
  });

  describe('of a query', () => {
    function injectTodos() {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          refFor: (firestore, uid) => collection(firestore, 'scratch', uid, 'todos'),
          listenTo: (todosRef) => query(todosRef, orderBy('rank')),
          map: (snapshot) => snapshot.docs.map((todo) => todo.id),
        }),
      );
    }

    it('lists the query, and every change made elsewhere', async () => {
      const uid = await signUp();
      await storeElsewhere(`scratch/${uid}/todos/second`, { rank: 2 });

      const todos = injectTodos();

      await vi.waitFor(() => expect(todos.value()).toEqual(['second']), slowEmulatorTimeout);
      await storeElsewhere(`scratch/${uid}/todos/first`, { rank: 1 });
      await vi.waitFor(
        () => expect(todos.value()).toEqual(['first', 'second']),
        slowEmulatorTimeout,
      );
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await deleteDoc(doc(context.firestore(), `scratch/${uid}/todos/second`));
      });
      await vi.waitFor(() => expect(todos.value()).toEqual(['first']), slowEmulatorTimeout);
    });

    it('counts a delete made offline as waiting to sync until back online', async () => {
      const uid = await signUp();
      await storeElsewhere(`scratch/${uid}/todos/first`, { rank: 1 });
      const todos = injectTodos();
      await vi.waitFor(() => expect(todos.value()).toEqual(['first']), slowEmulatorTimeout);
      const firestore = await TestBed.inject(FIRESTORE)();
      await disableNetwork(firestore);

      todos.track(deleteDoc(doc(await todos.ref(), 'first')));

      await vi.waitFor(() => {
        expect(todos.value()).toEqual([]);
        expect(todos.waitingToSync()).toBe(true);
      }, slowEmulatorTimeout);

      await enableNetwork(firestore);

      await vi.waitFor(() => expect(todos.waitingToSync()).toBe(false), slowEmulatorTimeout);
      expect(await stored(`scratch/${uid}/todos/first`)).toBeUndefined();
      expect(reportError).not.toHaveBeenCalled();
    });
  });
});
