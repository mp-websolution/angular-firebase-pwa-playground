import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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

type Files = Record<string, string>;

const baselineSources: Files = {
  'firestore.rules': firestoreSource,
  'src/app/features/features.routes.ts': 'export const featureRoutes = [];\n',
};

function feature(name: string, firestoreFragment?: string): Files {
  const files: Files = { [`src/app/features/${name}/${name}.routes.ts`]: 'export {};\n' };
  if (firestoreFragment) {
    files[`src/app/features/${name}/${name}.firestore.rules`] = firestoreFragment;
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

function assembledFirestoreRules(folder: string): Promise<string> {
  return readFile(join(folder, 'assembled-rules', 'firestore.rules'), 'utf8');
}

describe('assembling the rules (npm run rules:assemble)', () => {
  beforeAll(async () => {
    await rm(fixturesFolder, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(fixturesFolder, { recursive: true, force: true });
  });

  it('assembles the Baseline source without the marker when there are no Features', async () => {
    const folder = await fixture('no-features', baselineSources);

    expect(runIn(folder).status).toBe(0);

    expect(await assembledFirestoreRules(folder)).toBe(`rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedInAsOwner(ownerUid) {
      return request.auth != null && request.auth.uid == ownerUid;
    }

  }
}
`);
  });

  it("inserts every Feature's fragments at the marker, in Feature-name order, each named in comments", async () => {
    const folder = await fixture('two-features', {
      ...baselineSources,
      ...feature(
        'todo-lists',
        'match /users/{uid}/lists/{listId} {\n  allow read: if isSignedInAsOwner(uid);\n}\n',
      ),
      ...feature(
        'notes',
        'match /users/{uid}/notes/{noteId} {\n  allow read: if isSignedInAsOwner(uid);\n}\n',
      ),
    });

    expect(runIn(folder).status).toBe(0);

    expect(await assembledFirestoreRules(folder)).toBe(`rules_version = '2';

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
  });

  it('assembles Firestore rules only, leaving out any Storage fragment however it is named', async () => {
    const folder = await fixture('stray-storage-fragments', {
      ...baselineSources,
      ...feature('notes'),
      'src/app/features/notes/notes.storage.rules': 'match /notes/{id} {}\n',
      'src/app/features/notes/note.storage.rules': 'match /notes/{id} {}\n',
      'src/app/features/notes2/notes2.storage.rules': 'match /notes/{id} {}\n',
    });

    expect(runIn(folder)).toEqual({ status: 0, stderr: '' });

    expect(await assembledFirestoreRules(folder)).not.toContain('Feature: notes');
    expect(await readdir(join(folder, 'assembled-rules'))).toEqual(['firestore.rules']);
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
      ...feature('notes2', 'match /notes/{id} {}\n'),
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'src/app/features/notes2/notes2.firestore.rules belongs to Feature "notes2", but a Feature name has only lowercase letters and hyphens.',
    );
  });

  it('fails, naming the expected file, when a fragment is not named after its Feature', async () => {
    const folder = await fixture('misnamed-fragment', {
      ...baselineSources,
      ...feature('notes'),
      'src/app/features/notes/note.firestore.rules': 'match /notes/{id} {}\n',
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'src/app/features/notes/note.firestore.rules is not named after its Feature: rename it to notes.firestore.rules.',
    );
  });

  it('fails, quoting the marker, when the Baseline source has no marker line', async () => {
    const folder = await fixture('source-without-marker', {
      ...baselineSources,
      'firestore.rules': firestoreSource.replace(marker, ''),
    });

    const { status, stderr } = runIn(folder);

    expect(status).toBe(1);
    expect(stderr).toContain(`firestore.rules needs exactly one line "${marker}".`);
  });
});
