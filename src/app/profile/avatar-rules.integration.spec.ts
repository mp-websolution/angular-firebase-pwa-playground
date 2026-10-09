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

function testEnvironmentWithDeployedStorageRules() {
  return initializeTestEnvironment({ projectId, storage: {} });
}

describe('Storage rules for avatars', () => {
  let testEnv: RulesTestEnvironment;
  let ada: string;
  let grace: string;

  beforeAll(async () => {
    testEnv = await testEnvironmentWithDeployedStorageRules();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    ada = `ada-${crypto.randomUUID()}`;
    grace = `grace-${crypto.randomUUID()}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const avatar = ref(context.storage(`gs://${storageBucket}`), `avatars/${ada}`);
      await uploadBytes(avatar, ...imageBytesAndMetadata());
    });
  });

  function avatarAs(uid: string | null, avatarUid: string) {
    const context = uid ? testEnv.authenticatedContext(uid) : testEnv.unauthenticatedContext();
    return ref(context.storage(`gs://${storageBucket}`), `avatars/${avatarUid}`);
  }

  function imageBytesAndMetadata(size = 1024, contentType = 'image/png') {
    return [new Uint8Array(size), { contentType }] as const;
  }

  const twoMegabytes = 2 * 1024 * 1024;

  it('lets users upload their own avatar', async () => {
    await assertSucceeds(uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata()));
  });

  it('lets anyone read an avatar, signed in or not', async () => {
    await assertSucceeds(getBytes(avatarAs(ada, ada)));
    await assertSucceeds(getBytes(avatarAs(grace, ada)));
    await assertSucceeds(getBytes(avatarAs(null, ada)));
  });

  it("keeps other users from replacing someone's avatar", async () => {
    await assertFails(uploadBytes(avatarAs(grace, ada), ...imageBytesAndMetadata()));
  });

  it('keeps signed-out visitors from uploading avatars', async () => {
    await assertFails(uploadBytes(avatarAs(null, ada), ...imageBytesAndMetadata()));
  });

  it('accepts an image of exactly 2 MB', async () => {
    await assertSucceeds(uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata(twoMegabytes)));
  });

  it('rejects an image larger than 2 MB', async () => {
    await assertFails(uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata(twoMegabytes + 1)));
  });

  it.each(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])(
    'accepts an image of type %s',
    async (contentType) => {
      await assertSucceeds(
        uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata(1024, contentType)),
      );
    },
  );

  it('rejects an SVG image, whose scripts would run when someone opens its public URL', async () => {
    await assertFails(
      uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata(1024, 'image/svg+xml')),
    );
  });

  it.each(['image/bmp', 'image/pngx', 'text/plain', 'application/octet-stream'])(
    'rejects a file of type %s',
    async (contentType) => {
      await assertFails(
        uploadBytes(avatarAs(ada, ada), ...imageBytesAndMetadata(1024, contentType)),
      );
    },
  );

  it('lets users delete their own avatar', async () => {
    await assertSucceeds(deleteObject(avatarAs(ada, ada)));
  });

  it("keeps other users and signed-out visitors from deleting someone's avatar", async () => {
    await assertFails(deleteObject(avatarAs(grace, ada)));
    await assertFails(deleteObject(avatarAs(null, ada)));
  });

  it('denies paths that no rule opens', async () => {
    const context = testEnv.authenticatedContext(ada);
    await assertFails(getBytes(ref(context.storage(`gs://${storageBucket}`), `secrets/${ada}`)));
  });
});
