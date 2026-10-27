import {
  EnvironmentInjector,
  ErrorHandler,
  Signal,
  createEnvironmentInjector,
  runInInjectionContext,
  signal,
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
  where,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import { injectLiveData } from './inject-live-data';
import {
  enablePersistentCacheInJsdom,
  signInAsNewUser,
  slowEmulatorTimeout,
  tearDownFirebase,
} from '../testing/emulator-setup';

const projectIsolatingTheseRules = 'demo-live-data';

const rulesOpenExceptRejectedWritesAndSignedOutSharedWrites = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scratch/{uid}/{document=**} {
      allow read, delete: if true;
      allow create, update: if request.resource.data.get('rejected', false) != true;
    }
    match /shared/{document=**} {
      allow read: if true;
      allow create, update: if request.auth != null;
    }
  }
}`;

describe('injectLiveData against the emulators', () => {
  let testEnv: RulesTestEnvironment;
  const reportError = vi.fn<(error: unknown) => void>();

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: projectIsolatingTheseRules,
      firestore: { rules: rulesOpenExceptRejectedWritesAndSignedOutSharedWrites },
    });
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
        provideFirebase({
          ...firebase,
          options: { ...firebase.options, projectId: projectIsolatingTheseRules },
        }),
        { provide: RELOAD_PAGE, useValue: vi.fn() },
        { provide: ErrorHandler, useValue: { handleError: reportError } },
      ],
    });
  });

  afterEach(tearDownFirebase);

  async function writeAsAnotherDeviceWithDisabledRules(
    path: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), path), data);
    });
  }

  async function readFromServerWithDisabledRules(path: string): Promise<unknown> {
    let data: unknown;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      data = (await getDoc(doc(context.firestore(), path))).data();
    });
    return data;
  }

  async function deleteAsAnotherDeviceWithDisabledRules(path: string): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await deleteDoc(doc(context.firestore(), path));
    });
  }

  function giveFirestoreTimeToNotifyListenersOfShutdown(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  describe('of a document', () => {
    function injectSettings() {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          userRefFor: (firestore, uid) => doc(firestore, 'scratch', uid),
          map: (snapshot): string => snapshot.get('theme') ?? 'system',
        }),
      );
    }

    it('shows the stored document, and every change made elsewhere', async () => {
      const uid = await signInAsNewUser();
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}`, { theme: 'dark' });

      const settings = injectSettings();

      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}`, { theme: 'light' });
      await vi.waitFor(() => expect(settings.value()).toBe('light'), slowEmulatorTimeout);
      expect(settings.waitingToSync()).toBe(false);
      expect(settings.loadFailed()).toBe(false);
    });

    it('is loading until the data has loaded', async () => {
      await signInAsNewUser();

      const settings = injectSettings();

      expect(settings.loading()).toBe(true);
      await vi.waitFor(() => expect(settings.loading()).toBe(false), slowEmulatorTimeout);
      expect(settings.value()).toBe('system');
    });

    it('stops loading once the first data arrives, even from the cache while offline', async () => {
      await signInAsNewUser();
      await disableNetwork(await TestBed.inject(FIRESTORE)());

      const settings = injectSettings();

      expect(settings.loading()).toBe(true);
      await vi.waitFor(() => expect(settings.loading()).toBe(false), slowEmulatorTimeout);
      expect(settings.value()).toBe('system');
      expect(settings.loadFailed()).toBe(false);
    });

    it('shows a tracked write straight away and, while online, saves it without waiting to sync', async () => {
      const uid = await signInAsNewUser();
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('system'), slowEmulatorTimeout);

      settings.track(setDoc(await settings.ref(), { theme: 'dark' }));

      await vi.waitFor(() => expect(settings.value()).toBe('dark'), slowEmulatorTimeout);
      expect(settings.waitingToSync()).toBe(false);
      await vi.waitFor(
        async () =>
          expect(await readFromServerWithDisabledRules(`scratch/${uid}`)).toEqual({
            theme: 'dark',
          }),
        slowEmulatorTimeout,
      );
    });

    it('shows a write made offline straight away and syncs it once back online', async () => {
      const uid = await signInAsNewUser();
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
      expect(await readFromServerWithDisabledRules(`scratch/${uid}`)).toEqual({ theme: 'dark' });
      expect(reportError).not.toHaveBeenCalled();
    });

    it('reports a write the server rejects, and shows what the server kept', async () => {
      const uid = await signInAsNewUser();
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}`, { theme: 'dark' });
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

    it('says when the data cannot be loaded, and reports why, and stops loading', async () => {
      await signInAsNewUser();

      const forbidden = TestBed.runInInjectionContext(() =>
        injectLiveData({
          userRefFor: (firestore, uid) => doc(firestore, 'forbidden', uid),
          map: (snapshot) => snapshot.data(),
        }),
      );

      await vi.waitFor(() => expect(forbidden.loadFailed()).toBe(true), slowEmulatorTimeout);
      expect(forbidden.loading()).toBe(false);
      expect(forbidden.value()).toBeUndefined();
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'permission-denied' }),
      );
    });

    it('reports no failure once destroyed, even if the data then fails to load', async () => {
      await signInAsNewUser();
      const injector = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
      const failing = runInInjectionContext(injector, () =>
        injectLiveData({
          userRefFor: (): DocumentReference => {
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
      await signInAsNewUser();
      const settings = injectSettings();
      await vi.waitFor(() => expect(settings.value()).toBe('system'), slowEmulatorTimeout);

      await TestBed.inject(AuthSession).signOut();
      await giveFirestoreTimeToNotifyListenersOfShutdown();

      expect(settings.loadFailed()).toBe(false);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('throws without a signed-in user', () => {
      expect(() => injectSettings()).toThrow('injectLiveData needs a signed-in user.');
    });
  });

  describe('of a query', () => {
    function injectTodos() {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          userRefFor: (firestore, uid) => collection(firestore, 'scratch', uid, 'todos'),
          listenTo: (todosRef) => query(todosRef, orderBy('rank')),
          map: (snapshot) => snapshot.docs.map((todo) => todo.id),
        }),
      );
    }

    it('lists the query, and every change made elsewhere', async () => {
      const uid = await signInAsNewUser();
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/second`, { rank: 2 });

      const todos = injectTodos();

      await vi.waitFor(() => expect(todos.value()).toEqual(['second']), slowEmulatorTimeout);
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/first`, { rank: 1 });
      await vi.waitFor(
        () => expect(todos.value()).toEqual(['first', 'second']),
        slowEmulatorTimeout,
      );
      await deleteAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/second`);
      await vi.waitFor(() => expect(todos.value()).toEqual(['first']), slowEmulatorTimeout);
    });

    it('counts a delete made offline as waiting to sync until back online', async () => {
      const uid = await signInAsNewUser();
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/first`, { rank: 1 });
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
      expect(await readFromServerWithDisabledRules(`scratch/${uid}/todos/first`)).toBeUndefined();
      expect(reportError).not.toHaveBeenCalled();
    });
  });

  describe('of a query that follows a signal', () => {
    function injectTodosOn(list: Signal<string>, seen: string[][] = []) {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          userRefFor: (firestore, uid) => collection(firestore, 'scratch', uid, 'todos'),
          listenTo: (todosRef) =>
            list() === 'forbidden'
              ? collection(todosRef.firestore, 'forbidden')
              : query(todosRef, where('list', '==', list()), orderBy('rank')),
          map: (snapshot) => {
            const ids = snapshot.docs.map((todo) => todo.id);
            seen.push(ids);
            return ids;
          },
        }),
      );
    }

    async function storeHomeAndWorkTodos(uid: string): Promise<void> {
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/shopping`, {
        list: 'home',
        rank: 1,
      });
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/report`, {
        list: 'work',
        rank: 1,
      });
    }

    it('keeps the old value while loading the new query, then shows the new one', async () => {
      const uid = await signInAsNewUser();
      await storeHomeAndWorkTodos(uid);
      const list = signal('home');
      const todos = injectTodosOn(list);
      await vi.waitFor(() => expect(todos.value()).toEqual(['shopping']), slowEmulatorTimeout);
      expect(todos.loading()).toBe(false);

      list.set('work');
      TestBed.tick();

      expect(todos.loading()).toBe(true);
      expect(todos.value()).toEqual(['shopping']);
      await vi.waitFor(() => {
        expect(todos.value()).toEqual(['report']);
        expect(todos.loading()).toBe(false);
      }, slowEmulatorTimeout);
    });

    it('stops listening to the old query', async () => {
      const uid = await signInAsNewUser();
      await storeHomeAndWorkTodos(uid);
      const list = signal('home');
      const seen: string[][] = [];
      const todos = injectTodosOn(list, seen);
      await vi.waitFor(() => expect(todos.value()).toEqual(['shopping']), slowEmulatorTimeout);
      list.set('work');
      await vi.waitFor(() => expect(todos.value()).toEqual(['report']), slowEmulatorTimeout);

      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/laundry`, {
        list: 'home',
        rank: 2,
      });
      await writeAsAnotherDeviceWithDisabledRules(`scratch/${uid}/todos/slides`, {
        list: 'work',
        rank: 2,
      });

      await vi.waitFor(
        () => expect(todos.value()).toEqual(['report', 'slides']),
        slowEmulatorTimeout,
      );
      expect(seen.flat()).not.toContain('laundry');
    });

    it('stops saying the data cannot be loaded once the query changes to one that loads', async () => {
      const uid = await signInAsNewUser();
      await storeHomeAndWorkTodos(uid);
      const list = signal('forbidden');
      const todos = injectTodosOn(list);
      await vi.waitFor(() => expect(todos.loadFailed()).toBe(true), slowEmulatorTimeout);

      list.set('home');
      TestBed.tick();

      expect(todos.loadFailed()).toBe(false);
      expect(todos.loading()).toBe(true);
      await vi.waitFor(() => {
        expect(todos.value()).toEqual(['shopping']);
        expect(todos.loading()).toBe(false);
      }, slowEmulatorTimeout);
      expect(todos.loadFailed()).toBe(false);
    });
  });

  describe('of shared data', () => {
    function injectBoardTitle(boardId: string) {
      return TestBed.runInInjectionContext(() =>
        injectLiveData({
          refFor: (firestore) => doc(firestore, 'shared', boardId),
          map: (snapshot): string => snapshot.get('title') ?? 'Untitled',
        }),
      );
    }

    it('shows the stored document to a signed-out visitor, and every change made elsewhere', async () => {
      const boardId = crypto.randomUUID();
      await writeAsAnotherDeviceWithDisabledRules(`shared/${boardId}`, { title: 'Ideas' });

      const title = injectBoardTitle(boardId);

      await vi.waitFor(() => expect(title.value()).toBe('Ideas'), slowEmulatorTimeout);
      await writeAsAnotherDeviceWithDisabledRules(`shared/${boardId}`, { title: 'Plans' });
      await vi.waitFor(() => expect(title.value()).toBe('Plans'), slowEmulatorTimeout);
      expect(title.loading()).toBe(false);
      expect(title.loadFailed()).toBe(false);
      expect(reportError).not.toHaveBeenCalled();
    });

    it("saves a signed-in user's tracked write", async () => {
      await signInAsNewUser();
      const boardId = crypto.randomUUID();
      const title = injectBoardTitle(boardId);
      await vi.waitFor(() => expect(title.value()).toBe('Untitled'), slowEmulatorTimeout);

      title.track(setDoc(await title.ref(), { title: 'Ideas' }));

      await vi.waitFor(() => expect(title.value()).toBe('Ideas'), slowEmulatorTimeout);
      await vi.waitFor(
        async () =>
          expect(await readFromServerWithDisabledRules(`shared/${boardId}`)).toEqual({
            title: 'Ideas',
          }),
        slowEmulatorTimeout,
      );
      expect(reportError).not.toHaveBeenCalled();
    });
  });
});
