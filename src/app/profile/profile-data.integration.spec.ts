import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { RELOAD_PAGE } from '../browser/reload-page';
import { provideFirebase } from '../firebase/provide-firebase';
import { tearDownFirebase } from '../firebase/testing/tear-down-firebase';
import { testEnvironmentWithDeployedFirestoreRules } from '../firebase/testing/deployed-firestore-rules';
import { signInAsNewUser } from '../firebase/testing/sign-in-as-new-user';
import { ProfileData } from './profile-data';
import { enablePersistentCacheInJsdom } from '../firebase/testing/persistent-cache-in-jsdom';
import { slowEmulatorTestTimeout, slowEmulatorTimeout } from '../firebase/testing/slow-emulator';

// Tests run in Node, but only see the browser's types.
declare const process: { getBuiltinModule(id: 'node:buffer'): { Blob: typeof Blob } };

describe('ProfileData against the emulators', slowEmulatorTestTimeout, () => {
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

  /** What the server has, read past the rules. */
  async function storedProfile(uid: string): Promise<unknown> {
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
      async () => expect(await storedProfile(uid)).toEqual({ displayName: 'Ada' }),
      slowEmulatorTimeout,
    );
  });

  describe('avatar', () => {
    beforeEach(() => {
      // Storage's Node build sends uploads with Node's fetch, which can't read jsdom's Blobs.
      vi.stubGlobal('Blob', process.getBuiltinModule('node:buffer').Blob);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    /** A stand-in for an image file; Storage only looks at its bytes and type. */
    function image(bytes: number[]): Blob {
      return new Blob([new Uint8Array(bytes)], { type: 'image/png' });
    }

    /** Downloads the avatar like an `<img>` would: without signing in. */
    async function download(avatarUrl: string | undefined) {
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

      await profileData.uploadAvatar(image([1, 2, 3]));

      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).toBeDefined(),
        slowEmulatorTimeout,
      );
      const { avatarUrl } = profileData.profile()!;
      expect(profileData.profile()).toEqual({ displayName: 'Ada', avatarUrl });
      expect(await download(avatarUrl)).toEqual({ contentType: 'image/png', bytes: [1, 2, 3] });
      await vi.waitFor(
        async () => expect(await storedProfile(uid)).toEqual({ displayName: 'Ada', avatarUrl }),
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
      await profileData.uploadAvatar(image([1, 2, 3]));
      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).toBeDefined(),
        slowEmulatorTimeout,
      );
      const firstUrl = profileData.profile()?.avatarUrl;

      await profileData.uploadAvatar(image([4, 5, 6]));

      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).not.toBe(firstUrl),
        slowEmulatorTimeout,
      );
      expect(await download(profileData.profile()?.avatarUrl)).toEqual({
        contentType: 'image/png',
        bytes: [4, 5, 6],
      });
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
