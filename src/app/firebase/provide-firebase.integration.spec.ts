import { TestBed } from '@angular/core/testing';
import { Auth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { Firestore, doc, getDoc, getFirestore, terminate } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { environment } from '../../environments/environment';
import {
  FIREBASE_AUTH,
  FIREBASE_STORAGE,
  FIRESTORE,
  provideFirebase,
  signOutAndClearCache,
} from './provide-firebase';
import { enablePersistentCacheInJsdom } from './testing/persistent-cache-in-jsdom';

const { emulators } = environment.firebase;

const ruleTraceOnlyTheEmulatorGives = expect.stringContaining("false for 'get' @ L");

function signUpProbeUser(auth: Auth, email = `probe-${crypto.randomUUID()}@example.com`) {
  return createUserWithEmailAndPassword(auth, email, crypto.randomUUID());
}

function readPathNoRuleOpens(firestore: Firestore) {
  return getDoc(doc(firestore, 'probe/doc'));
}

async function signOutSinceAuthKeepsTheUserAcrossApps(): Promise<void> {
  await signOut(TestBed.inject(FIREBASE_AUTH));
}

describe('provideFirebase against the emulators', () => {
  afterEach(signOutSinceAuthKeepsTheUserAcrossApps);

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

      await expect(readPathNoRuleOpens(firestore)).rejects.toMatchObject({
        code: 'permission-denied',
        message: ruleTraceOnlyTheEmulatorGives,
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

    it('loads Firestore again on the next call after loading it failed', async () => {
      const loadFirestore = TestBed.inject(FIRESTORE);
      const blockingFirestore = getFirestore(getApp());
      await expect(loadFirestore()).rejects.toMatchObject({ code: 'failed-precondition' });

      await terminate(blockingFirestore);

      await expect(loadFirestore()).resolves.toBeInstanceOf(Firestore);
    });
  });

  describe('with the persistent cache', () => {
    beforeEach(() => {
      enablePersistentCacheInJsdom();
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
      await expect(readPathNoRuleOpens(firestore)).rejects.toThrow();
      const cacheExists = async () =>
        (await indexedDB.databases()).some(({ name }) => name?.startsWith('firestore/'));
      expect(await cacheExists()).toBe(true);

      await signOutAndClearCache(auth, loadFirestore);

      expect(auth.currentUser).toBeNull();
      expect(() => readPathNoRuleOpens(firestore)).toThrow('terminated');
      expect(await cacheExists()).toBe(false);
    });
  });
});
