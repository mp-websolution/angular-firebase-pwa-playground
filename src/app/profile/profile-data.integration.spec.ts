// jsdom has no IndexedDB; Firestore's persistent cache needs one.
import 'fake-indexeddb/auto';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { signOut } from 'firebase/auth';
import { disableNetwork, doc, enableNetwork, getDoc, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIREBASE_AUTH, FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import { ProfileData } from './profile-data';

// Tests run in Node, but only see the browser's types.
declare const process: { getBuiltinModule(id: 'node:buffer'): { Blob: typeof Blob } };

// On a cold CI runner the emulator can take seconds to answer, but `vi.waitFor` gives up after 1 s.
const emulatorReply = { timeout: 5_000 };

describe('ProfileData against the Firestore emulator', { timeout: 20_000 }, () => {
  let testEnv: RulesTestEnvironment;
  const reportError = vi.fn<(error: unknown) => void>();

  beforeAll(async () => {
    // Writes profiles as they'd be there already, past the rules. Finds the emulator through
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

  /** Signs a new user in, as the guard makes sure before the profile page loads. */
  async function signUp(): Promise<string> {
    const session = TestBed.inject(AuthSession);
    await session.signUpWithEmail({
      email: `profile-${crypto.randomUUID()}@example.com`,
      password: 'correct-horse',
    });
    return session.user()!.uid;
  }

  /** What the server has, read past the rules. */
  async function storedProfile(uid: string): Promise<unknown> {
    let profile: unknown;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      profile = (await getDoc(doc(context.firestore(), 'profiles', uid))).data();
    });
    return profile;
  }

  it("reads the signed-in user's stored profile", async () => {
    const uid = await signUp();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
    });

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: 'Ada' }),
      emulatorReply,
    );
  });

  it('has no display name for a user who never set one', async () => {
    await signUp();

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: '' }),
      emulatorReply,
    );
  });

  it('changes the display name and syncs it to the server', async () => {
    const uid = await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(
      () => expect(profileData.profile()).toEqual({ displayName: 'Ada' }),
      emulatorReply,
    );
    expect(profileData.waitingToSync()).toBe(false);
    await vi.waitFor(
      async () => expect(await storedProfile(uid)).toEqual({ displayName: 'Ada' }),
      emulatorReply,
    );
  });

  it('shows a change made offline straight away and syncs it once back online', async () => {
    const uid = await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(() => {
      expect(profileData.profile()).toEqual({ displayName: 'Ada' });
      expect(profileData.waitingToSync()).toBe(true);
    }, emulatorReply);

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(profileData.waitingToSync()).toBe(false), emulatorReply);
    expect(await storedProfile(uid)).toEqual({ displayName: 'Ada' });
  });

  it('reports no failure when sign-out shuts Firestore down', async () => {
    await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);

    await TestBed.inject(AuthSession).signOut();
    // Firestore tells listeners about the shutdown asynchronously; give it the chance.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(profileData.loadFailed()).toBe(false);
    expect(reportError).not.toHaveBeenCalled();
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
      const uid = await signUp();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
      });
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);

      await profileData.uploadAvatar(image([1, 2, 3]));

      await vi.waitFor(() => expect(profileData.profile()?.avatarUrl).toBeDefined(), emulatorReply);
      const { avatarUrl } = profileData.profile()!;
      expect(profileData.profile()).toEqual({ displayName: 'Ada', avatarUrl });
      expect(await download(avatarUrl)).toEqual({ contentType: 'image/png', bytes: [1, 2, 3] });
      await vi.waitFor(
        async () => expect(await storedProfile(uid)).toEqual({ displayName: 'Ada', avatarUrl }),
        emulatorReply,
      );
    });

    it('replaces the avatar under a new URL, so browsers show the new image', async () => {
      await signUp();
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);
      await profileData.uploadAvatar(image([1, 2, 3]));
      await vi.waitFor(() => expect(profileData.profile()?.avatarUrl).toBeDefined(), emulatorReply);
      const firstUrl = profileData.profile()?.avatarUrl;

      await profileData.uploadAvatar(image([4, 5, 6]));

      await vi.waitFor(
        () => expect(profileData.profile()?.avatarUrl).not.toBe(firstUrl),
        emulatorReply,
      );
      expect(await download(profileData.profile()?.avatarUrl)).toEqual({
        contentType: 'image/png',
        bytes: [4, 5, 6],
      });
    });

    it('rejects an upload that Storage refuses, and keeps the profile as it was', async () => {
      await signUp();
      const profileData = TestBed.inject(ProfileData);
      await vi.waitFor(() => expect(profileData.profile()).toBeDefined(), emulatorReply);

      await expect(
        profileData.uploadAvatar(new Blob(['not an image'], { type: 'text/plain' })),
      ).rejects.toThrow();

      expect(profileData.profile()).toEqual({ displayName: '' });
    });
  });
});
