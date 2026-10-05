// Node, not jsdom: the Storage SDK would send jsdom's Blobs, which Node's fetch can't, so every
// upload would fail before the rules see it.
// @vitest-environment node
import {
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';
import { environment } from '../../environments/environment';

const { projectId, storageBucket } = environment.firebase.options;

describe('Storage rules for avatars', () => {
  let testEnv: RulesTestEnvironment;
  let ada: string;
  let grace: string;

  beforeAll(async () => {
    // No rules passed: the emulator already runs storage.rules, the file that gets deployed.
    // `emulators:exec` tells it where the Storage emulator is (FIREBASE_STORAGE_EMULATOR_HOST).
    testEnv = await initializeTestEnvironment({
      projectId,
      storage: {},
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    // Fresh users per test, so tests never see each other's avatars.
    ada = `ada-${crypto.randomUUID()}`;
    grace = `grace-${crypto.randomUUID()}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const avatar = ref(context.storage(`gs://${storageBucket}`), `avatars/${ada}`);
      await uploadBytes(avatar, ...image());
    });
  });

  function avatarAs(uid: string | null, avatarUid: string) {
    const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
    return ref(context.storage(`gs://${storageBucket}`), `avatars/${avatarUid}`);
  }

  /** What `uploadBytes` takes: the bytes, then their metadata. */
  function image(size = 1024, contentType = 'image/png') {
    return [new Uint8Array(size), { contentType }] as const;
  }

  const twoMegabytes = 2 * 1024 * 1024;

  it('lets users upload their own avatar', async () => {
    await assertSucceeds(uploadBytes(avatarAs(ada, ada), ...image()));
  });

  it('lets anyone read an avatar, signed in or not', async () => {
    await assertSucceeds(getBytes(avatarAs(ada, ada)));
    await assertSucceeds(getBytes(avatarAs(grace, ada)));
    await assertSucceeds(getBytes(avatarAs(null, ada)));
  });

  it("keeps other users from replacing someone's avatar", async () => {
    await assertFails(uploadBytes(avatarAs(grace, ada), ...image()));
  });

  it('keeps signed-out visitors from uploading avatars', async () => {
    await assertFails(uploadBytes(avatarAs(null, ada), ...image()));
  });

  it('accepts an image of exactly 2 MB', async () => {
    await assertSucceeds(uploadBytes(avatarAs(ada, ada), ...image(twoMegabytes)));
  });

  it('rejects an image larger than 2 MB', async () => {
    await assertFails(uploadBytes(avatarAs(ada, ada), ...image(twoMegabytes + 1)));
  });

  it.each(['text/plain', 'application/octet-stream'])(
    'rejects a file of type %s',
    async (contentType) => {
      await assertFails(uploadBytes(avatarAs(ada, ada), ...image(1024, contentType)));
    },
  );

  it('keeps everyone from deleting avatars, as the app never does', async () => {
    await assertFails(deleteObject(avatarAs(ada, ada)));
    await assertFails(deleteObject(avatarAs(grace, ada)));
  });

  it('denies paths that no rule opens', async () => {
    const context = testEnv.authenticatedContext(ada);
    await assertFails(getBytes(ref(context.storage(`gs://${storageBucket}`), `secrets/${ada}`)));
  });
});
