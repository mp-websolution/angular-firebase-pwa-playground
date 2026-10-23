import { ESLint } from 'eslint';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type RuleId = '@softarc/sheriff/dependency-rule' | '@softarc/sheriff/encapsulation';

interface LintCase {
  name: string;
  folder: string;
  isSpec?: boolean;
  source: string;
  expectedRuleIds: RuleId[];
}

const repoRoot = resolve(import.meta.dirname, '..');
const appFolder = join(repoRoot, 'src/app');
const throwawayFeature = 'features/sheriff-fixture';

function importing(name: string, path: string): string {
  return `import { ${name} } from '${path}';\nexport const fixture = ${name};\n`;
}

const cases: LintCase[] = [
  {
    name: 'ADR 0005: a Baseline module importing a Feature fails the dependency rule',
    folder: 'profile',
    source: importing('notesRoutes', '../features/notes/notes.routes'),
    expectedRuleIds: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: a Feature importing another Feature fails the dependency rule',
    folder: throwawayFeature,
    source: importing('notesRoutes', '../notes/notes.routes'),
    expectedRuleIds: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: production code importing the test helpers fails the dependency rule',
    folder: 'profile',
    source: importing('FakeAuthSession', '../testing/fake-auth-session'),
    expectedRuleIds: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: a spec importing the test helpers passes',
    folder: 'profile',
    isSpec: true,
    source: importing('FakeAuthSession', '../testing/fake-auth-session'),
    expectedRuleIds: [],
  },
  {
    name: "ADR 0006: a module importing another module's internal file fails encapsulation",
    folder: 'profile',
    source: importing('returnUrlQueryParams', '../auth/internal/return-url'),
    expectedRuleIds: ['@softarc/sheriff/encapsulation'],
  },
  {
    name: "ADR 0007: the app routes' module importing a Baseline page fails encapsulation",
    folder: '.',
    source: importing('SignIn', './auth/internal/sign-in/sign-in'),
    expectedRuleIds: ['@softarc/sheriff/encapsulation'],
  },
  {
    name: "ADR 0005: a Baseline module importing auth's public guard passes",
    folder: 'profile',
    source: importing('signedInGuard', '../auth/auth-guards'),
    expectedRuleIds: [],
  },
  {
    name: 'ADR 0005: a Feature importing a Baseline module passes',
    folder: throwawayFeature,
    source: importing('ProfileData', '../../profile/profile-data'),
    expectedRuleIds: [],
  },
];

const fixtures = cases.map((lintCase, index) => {
  const extension = lintCase.isSpec ? '.spec.ts' : '.ts';
  const path = join(appFolder, lintCase.folder, `sheriff-fixture-${index}${extension}`);
  return { ...lintCase, path };
});

async function writeFixtures(): Promise<void> {
  for (const { path, source } of fixtures) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, source);
  }
}

async function removeFixtures(): Promise<void> {
  await Promise.all(fixtures.map(({ path }) => rm(path, { force: true })));
  await rm(join(appFolder, throwawayFeature), { recursive: true, force: true });
}

describe('sheriff rules', () => {
  const ruleIdsByPath = new Map<string, (RuleId | null)[]>();

  beforeAll(async () => {
    await removeFixtures();
    await writeFixtures();
    const results = await new ESLint({ cwd: repoRoot }).lintFiles(fixtures.map(({ path }) => path));
    for (const { filePath, messages } of results) {
      ruleIdsByPath.set(
        filePath,
        messages.map(({ ruleId }) => ruleId as RuleId | null),
      );
    }
  });

  afterAll(async () => {
    await removeFixtures();
  });

  for (const { name, path, expectedRuleIds } of fixtures) {
    it(name, () => {
      expect(ruleIdsByPath.get(path)).toEqual(expectedRuleIds);
    });
  }
});
