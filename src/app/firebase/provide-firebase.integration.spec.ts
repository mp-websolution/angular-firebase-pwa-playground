// jsdom has no IndexedDB; Firestore's persistent cache needs one.
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Auth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Firestore, doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { environment } from '../../environments/environment';
import {
  FIREBASE_AUTH,
  FIREBASE_STORAGE,
  FIRESTORE,
  provideFirebase,
  signOutAndClearCache,
} from './provide-firebase';

const { emulators } = environment.firebase;

function signUpProbeUser(auth: Auth, email = `probe-${crypto.randomUUID()}@example.com`) {
  return createUserWithEmailAndPassword(auth, email, crypto.randomUUID());
}

// A path no rule will ever open, so the deny-all default answers it.
function readProbeDoc(firestore: Firestore) {
  return getDoc(doc(firestore, 'probe/doc'));
}

describe('provideFirebase against the emulators', () => {
  // Auth persists the signed-in user across app instances; don't let it leak into the next test.
  afterEach(async () => {
    await signOut(TestBed.inject(FIREBASE_AUTH));
  });

  describe('with the memory cache', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideFirebase({ ...environment.firebase, firestoreCache: 'memory' })],
      });
    });

    it('signs up a user through the Auth emulator', async () => {
      const email = `probe-${crypto.randomUUID()}@example.com`;

      const { user } = await signUpProbeUser(TestBed.inject(FIREBASE_AUTH), email);

      expect(user.email).toBe(email);
    });

    it('is answered by the Firestore emulator, whose default rules deny reads', async () => {
      const firestore = await TestBed.inject(FIRESTORE)();

      // Only the emulator explains a denial with its rule trace; Firebase says "Missing or insufficient permissions".
      await expect(readProbeDoc(firestore)).rejects.toMatchObject({
        code: 'permission-denied',
        message: expect.stringContaining("false for 'get' @ L"),
      });
    });

    it('is answered by the Storage emulator, whose default rules deny reads', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      onTestFinished(() => {
        fetchSpy.mockRestore();
      });

      await expect(
        getDownloadURL(ref(TestBed.inject(FIREBASE_STORAGE), 'probe.txt')),
      ).rejects.toMatchObject({ code: 'storage/unauthorized' });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(`^http://${emulators?.host}:${emulators?.storagePort}/`),
        expect.anything(),
      );
    });
  });

  describe('with the persistent cache', () => {
    beforeEach(() => {
      // Tests load Firestore's Node build, which only uses IndexedDB with its own test switch on.
      vi.stubEnv('USE_MOCK_PERSISTENCE', 'YES');
      TestBed.configureTestingModule({ providers: [provideFirebase(environment.firebase)] });
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('signs out, shuts Firestore down and deletes its on-disk cache', async () => {
      const auth = TestBed.inject(FIREBASE_AUTH);
      const loadFirestore = TestBed.inject(FIRESTORE);
      const firestore = await loadFirestore();
      await signUpProbeUser(auth);
      await expect(readProbeDoc(firestore)).rejects.toThrow();
      const cacheExists = async () =>
        (await indexedDB.databases()).some(({ name }) => name?.startsWith('firestore/'));
      expect(await cacheExists()).toBe(true);

      await signOutAndClearCache(auth, loadFirestore);

      expect(auth.currentUser).toBeNull();
      expect(() => readProbeDoc(firestore)).toThrow('terminated');
      expect(await cacheExists()).toBe(false);
    });
  });
});
