import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { disableNetwork, doc, enableNetwork, getDoc, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIREBASE_STORAGE, FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import {
  enablePersistentCacheInJsdom,
  signInAsNewUser,
  slowEmulatorTimeout,
  tearDownFirebase,
  testEnvironmentWithDeployedFirestoreRules,
} from '../firebase/testing/testing-utils';
import { ProfileData } from './profile-data';

declare const process: { getBuiltinModule(id: 'node:buffer'): { Blob: typeof Blob } };

function letStorageSendBlobsThroughNodeFetch() {
  vi.stubGlobal('Blob', process.getBuiltinModule('node:buffer').Blob);
}

describe('ProfileData against the emulators', () => {
  let testEnv: RulesTestEnvironment;
  const reportError = vi.fn();

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedFirestoreRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(() => {
    reportError.mockReset();
    enablePersistentCacheInJsdom();
    TestBed.configureTestingModule({
      providers: [
        provideFirebase(environment.firebase),
        { provide: RELOAD_PAGE, useValue: vi.fn() },
        { provide: ErrorHandler, useValue: { handleError: reportError } },
      ],
    });
  });

  afterEach(tearDownFirebase);

  async function profileOnTheServerWithDisabledRules(uid: string): Promise<unknown> {
    let profile: unknown;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      profile = (await getDoc(doc(context.firestore(), 'profiles', uid))).data();
    });
    return profile;
  }

  it("reads the signed-in user's stored profile", async () => {
    const uid = await signInAsNewUser();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
    });

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: 'Ada' }),
      slowEmulatorTimeout,
    );
  });

  it('has no display name for a user who never set one', async () => {
    await signInAsNewUser();

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: '' }),
      slowEmulatorTimeout,
    );
  });

  it('changes the display name and syncs it to the server', async () => {
    const uid = await signInAsNewUser();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: 'Ada' }),
      slowEmulatorTimeout,
    );
    await vi.waitFor(
      async () =>
        expect(await profileOnTheServerWithDisabledRules(uid)).toEqual({ displayName: 'Ada' }),
      slowEmulatorTimeout,
    );
  });

  it('saves a display name change offline and waits to sync it until back online', async () => {
    const uid = await signInAsNewUser();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(() => {
      expect(profileData.profile()).toEqual({ displayName: 'Ada' });
      expect(profileData.waitingToSync()).toBe(true);
    }, slowEmulatorTimeout);

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(profileData.waitingToSync()).toBe(false), slowEmulatorTimeout);
    expect(await profileOnTheServerWithDisabledRules(uid)).toEqual({ displayName: 'Ada' });
  });

  describe('avatar', () => {
    beforeEach(() => {
      letStorageSendBlobsThroughNodeFetch();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function cutTheConnectionToStorageAndStopRetryingSoon() {
      TestBed.inject(FIREBASE_STORAGE).maxUploadRetryTime = 100;
      vi.stubGlobal('fetch', () => Promise.reject(new TypeError('fetch failed')));
    }

    function pngWithBytes(bytes: number[]): Blob {
      return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    }

    async function downloadWithoutSigningInLikeAnImg(avatarUrl: string | undefined) {
      const response = await fetch(avatarUrl!);
      return {
        contentType: response.headers.get('content-type'),
        bytes: [...new Uint8Array(await response.arrayBuffer())],
      };
    }

    it('uploads an avatar that anyone can download, and the profile shows it', async () => {
      const uid = await signInAsNewUser();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
      });
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);

      await profileData.uploadAvatar(pngWithBytes([1, 2, 3]));

      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).toBeDefined(),
        slowEmulatorTimeout,
      );
      const { avatarUrl } = profileData.profile()!;
      expect(profileData.profile()).toEqual({ displayName: 'Ada', avatarUrl });
      expect(await downloadWithoutSigningInLikeAnImg(avatarUrl)).toEqual({
        contentType: 'image/png',
        bytes: [1, 2, 3],
      });
      await vi.waitFor(
        async () =>
          expect(await profileOnTheServerWithDisabledRules(uid)).toEqual({
            displayName: 'Ada',
            avatarUrl,
          }),
        slowEmulatorTimeout,
      );
    });

    it('replaces the avatar under a new URL, so browsers show the new image', async () => {
      const uid = await signInAsNewUser();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
      });
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);
      await profileData.uploadAvatar(pngWithBytes([1, 2, 3]));
      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).toBeDefined(),
        slowEmulatorTimeout,
      );
      const firstUrl = profileData.profile()?.avatarUrl;

      await profileData.uploadAvatar(pngWithBytes([4, 5, 6]));

      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).not.toBe(firstUrl),
        slowEmulatorTimeout,
      );
      expect(await downloadWithoutSigningInLikeAnImg(profileData.profile()?.avatarUrl)).toEqual({
        contentType: 'image/png',
        bytes: [4, 5, 6],
      });
      expect((await downloadWithoutSigningInLikeAnImg(firstUrl)).bytes).not.toEqual([1, 2, 3]);
    });

    it('rejects an avatar upload without a connection, and keeps the profile as it was', async () => {
      const uid = await signInAsNewUser();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
      });
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);
      cutTheConnectionToStorageAndStopRetryingSoon();

      await expect(profileData.uploadAvatar(pngWithBytes([1, 2, 3]))).rejects.toThrow();

      expect(profileData.profile()).toEqual({ displayName: 'Ada' });
    });

    it('records no avatar URL on a profile without a display name, and reports the refused write as a bug', async () => {
      const uid = await signInAsNewUser();
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);

      await profileData.uploadAvatar(pngWithBytes([1, 2, 3]));

      await vi.waitFor(
        () =>
          expect(reportError).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'permission-denied' }),
          ),
        slowEmulatorTimeout,
      );
      await vi.waitFor(
        () => expect(profileData.profile()).toEqual({ displayName: '' }),
        slowEmulatorTimeout,
      );
      expect(await profileOnTheServerWithDisabledRules(uid)).toBeUndefined();
    });

    it('rejects an upload that Storage refuses, and keeps the profile as it was', async () => {
      await signInAsNewUser();
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), slowEmulatorTimeout);

      await expect(
        profileData.uploadAvatar(new Blob(['not an image'], { type: 'text/plain' })),
      ).rejects.toThrow();

      expect(profileData.profile()).toEqual({ displayName: '' });
    });
  });
});
