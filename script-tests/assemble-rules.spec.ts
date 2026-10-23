import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repoRoot = resolve(import.meta.dirname, '..');
const assembleRules = join(repoRoot, 'scripts/assemble-rules.mjs');
const fixturesFolder = join(import.meta.dirname, '.fixtures/assemble-rules');

const marker = '// Feature rules: inserted here by scripts/assemble-rules.mjs';

const firestoreSource = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedInAsOwner(ownerUid) {
      return request.auth != null && request.auth.uid == ownerUid;
    }

    ${marker}
  }
}
`;

const storageSource = `rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    ${marker}
  }
}
`;

type Files = Record<string, string>;

const baselineSources: Files = {
  'firestore.rules': firestoreSource,
  'storage.rules': storageSource,
  'src/app/features/features.routes.ts': 'export const featureRoutes = [];\n',
};

function feature(name: string, fragments: { firestore?: string; storage?: string }): Files {
  const files: Files = { [`src/app/features/${name}/${name}.routes.ts`]: 'export {};\n' };
  if (fragments.firestore) {
    files[`src/app/features/${name}/${name}.firestore.rules`] = fragments.firestore;
  }
  if (fragments.storage) {
    files[`src/app/features/${name}/${name}.storage.rules`] = fragments.storage;
  }
  return files;
}

async function fixture(name: string, files: Files): Promise<string> {
  const folder = join(fixturesFolder, name);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(folder, path)), { recursive: true });
    await writeFile(join(folder, path), content);
  }
  return folder;
}

function runIn(folder: string) {
  const { status, stderr } = spawnSync(process.execPath, [assembleRules], {
    cwd: folder,
    encoding: 'utf8',
  });
  return { status, stderr };
}

function assembled(folder: string, service: 'firestore' | 'storage'): Promise<string> {
  return readFile(join(folder, 'assembled-rules', `${service}.rules`), 'utf8');
}

describe('assembling the rules (npm run rules:assemble)', () => {
  beforeAll(async () => {
    await rm(fixturesFolder, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(fixturesFolder, { recursive: true, force: true });
  });

  it('assembles the Baseline sources without the marker when there are no Features', async () => {
    const folder = await fixture('no-features', baselineSources);

    expect(runIn(folder).status).toBe(0);

    expect(await assembled(folder, 'firestore')).toBe(`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedInAsOwner(ownerUid) {
      return request.auth != null && request.auth.uid == ownerUid;
    }

  }
}
`);
    expect(await assembled(folder, 'storage')).toBe(`rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
  }
}
`);
  });

  it("inserts every Feature's fragments at the marker, in Feature-name order, each named in comments", async () => {
    const folder = await fixture('two-features', {
      ...baselineSources,
      ...feature('todo-lists', {
        firestore:
          'match /users/{uid}/lists/{listId} {\n  allow read: if isSignedInAsOwner(uid);\n}\n',
      }),
      ...feature('notes', {
        firestore:
          'match /users/{uid}/notes/{noteId} {\n  allow read: if isSignedInAsOwner(uid);\n}\n',
        storage: 'match /notes/{uid} {\n  allow read: if true;\n}\n',
      }),
    });

    expect(runIn(folder).status).toBe(0);

    expect(await assembled(folder, 'firestore')).toBe(`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedInAsOwner(ownerUid) {
      return request.auth != null && request.auth.uid == ownerUid;
    }

    // ---- Feature: notes (src/app/features/notes) ----
    match /users/{uid}/notes/{noteId} {
      allow read: if isSignedInAsOwner(uid);
    }
    // ---- End of Feature: notes ----

    // ---- Feature: todo-lists (src/app/features/todo-lists) ----
    match /users/{uid}/lists/{listId} {
      allow read: if isSignedInAsOwner(uid);
    }
    // ---- End of Feature: todo-lists ----
  }
}
`);
    expect(await assembled(folder, 'storage')).toBe(`rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // ---- Feature: notes (src/app/features/notes) ----
    match /notes/{uid} {
      allow read: if true;
    }
    // ---- End of Feature: notes ----
  }
}
`);
  });

  it("fails, naming the missing file, when a fragment's Feature folder has no routes file", async () => {
    const folder = await fixture('fragment-without-routes', {
      ...baselineSources,
      'src/app/features/notes/notes.firestore.rules': 'match /notes/{id} {}\n',
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'src/app/features/notes/notes.firestore.rules has no Feature: src/app/features/notes/notes.routes.ts is missing.',
    );
  });

  it('fails, naming the rule, when a fragment belongs to a Feature whose name is not lowercase letters and hyphens', async () => {
    const folder = await fixture('feature-name-with-digit', {
      ...baselineSources,
      ...feature('notes2', { storage: 'match /notes/{id} {}\n' }),
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'src/app/features/notes2/notes2.storage.rules belongs to Feature "notes2", but a Feature name has only lowercase letters and hyphens.',
    );
  });

  it('fails, naming the expected file, when a fragment is not named after its Feature', async () => {
    const folder = await fixture('misnamed-fragment', {
      ...baselineSources,
      ...feature('notes', {}),
      'src/app/features/notes/note.firestore.rules': 'match /notes/{id} {}\n',
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'src/app/features/notes/note.firestore.rules is not named after its Feature: rename it to notes.firestore.rules.',
    );
  });

  it('fails, quoting the marker, when a Baseline source has no marker line', async () => {
    const folder = await fixture('source-without-marker', {
      ...baselineSources,
      'storage.rules': storageSource.replace(marker, ''),
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(`storage.rules needs exactly one line "${marker}".`);
  });
});
