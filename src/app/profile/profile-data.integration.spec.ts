// jsdom has no IndexedDB; Firestore's persistent cache needs one.
import 'fake-indexeddb/auto';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { signOut } from 'firebase/auth';
import { disableNetwork, doc, enableNetwork, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { AuthSession } from '../auth/auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIREBASE_AUTH, FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import { ProfileData } from './profile-data';

describe('ProfileData against the Firestore emulator', () => {
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

  it("reads the signed-in user's stored profile", async () => {
    const uid = await signUp();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'profiles', uid), { displayName: 'Ada' });
    });

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(() => expect(profileData.profile()).toEqual({ displayName: 'Ada' }));
  });

  it('has no display name for a user who never set one', async () => {
    await signUp();

    const profileData = TestBed.inject(ProfileData);

    await vi.waitFor(() => expect(profileData.profile()).toEqual({ displayName: '' }));
  });

  it('changes the display name and syncs it to the server', async () => {
    await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined());

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(() => {
      expect(profileData.profile()).toEqual({ displayName: 'Ada' });
      expect(profileData.syncing()).toBe(false);
    });
  });

  it('shows a change made offline straight away and syncs it once back online', async () => {
    await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined());
    const firestore = await TestBed.inject(FIRESTORE)();
    await disableNetwork(firestore);

    await profileData.updateDisplayName('Ada');

    await vi.waitFor(() => {
      expect(profileData.profile()).toEqual({ displayName: 'Ada' });
      expect(profileData.syncing()).toBe(true);
    });

    await enableNetwork(firestore);

    await vi.waitFor(() => expect(profileData.syncing()).toBe(false));
  });

  it('reports no failure when sign-out shuts Firestore down', async () => {
    await signUp();
    const profileData = TestBed.inject(ProfileData);
    await vi.waitFor(() => expect(profileData.profile()).toBeDefined());

    await TestBed.inject(AuthSession).signOut();
    // Firestore tells listeners about the shutdown asynchronously; give it the chance.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(profileData.loadFailed()).toBe(false);
    expect(reportError).not.toHaveBeenCalled();
  });
});
