import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { disableNetwork, doc, enableNetwork, getDoc, setDoc } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { RELOAD_PAGE } from '../browser/reload-page';
import { FIRESTORE, provideFirebase } from '../firebase/provide-firebase';
import {
  enablePersistentCacheInJsdom,
  signInAsNewUser,
  slowEmulatorTimeout,
  tearDownFirebase,
  testEnvironmentWithDeployedFirestoreRules,
} from '../testing/emulator-setup';
import { ProfileData } from './profile-data';

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
});
