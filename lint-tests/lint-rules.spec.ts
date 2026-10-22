import { ESLint } from 'eslint';
import { randomInt } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

type RuleId =
  | '@softarc/sheriff/dependency-rule'
  | '@softarc/sheriff/encapsulation'
  | '@angular-eslint/component-max-inline-declarations';

interface LintCase {
  name: string;
  folder: string;
  isSpec?: boolean;
  source: string;
  lintErrors: RuleId[];
}

const repoRoot = resolve(import.meta.dirname, '..');
const appFolder = join(repoRoot, 'src/app');
// Letters only: Sheriff takes a Feature folder only if its name is lowercase letters and hyphens.
const runId = Array.from({ length: 8 }, () => String.fromCharCode(97 + randomInt(26))).join('');
const throwawayFeature = `features/lint-fixture-${runId}`;

function componentWithInlineTemplate(lineCount: number): string {
  const lines = Array.from({ length: lineCount }, (_, index) => `    <p>Line ${index + 1}</p>`);
  return [
    `import { Component } from '@angular/core';`,
    `@Component({`,
    `  selector: 'app-lint-fixture',`,
    `  template: \``,
    ...lines,
    `  \`,`,
    `})`,
    `export class LintFixture {}`,
    ``,
  ].join('\n');
}

const cases: LintCase[] = [
  {
    name: 'ADR 0005: a Baseline module importing a Feature fails the dependency rule',
    folder: 'profile',
    source: `import { notesRoutes } from '../features/notes/notes.routes';\nexport const fixture = notesRoutes;\n`,
    lintErrors: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: a Feature importing another Feature fails the dependency rule',
    folder: throwawayFeature,
    source: `import { notesRoutes } from '../notes/notes.routes';\nexport const fixture = notesRoutes;\n`,
    lintErrors: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: production code importing the test helpers fails the dependency rule',
    folder: 'profile',
    source: `import { FakeAuthSession } from '../testing/fake-auth-session';\nexport const fixture = FakeAuthSession;\n`,
    lintErrors: ['@softarc/sheriff/dependency-rule'],
  },
  {
    name: 'ADR 0005: a spec importing the test helpers passes',
    folder: 'profile',
    isSpec: true,
    source: `import { FakeAuthSession } from '../testing/fake-auth-session';\nexport const fixture = FakeAuthSession;\n`,
    lintErrors: [],
  },
  {
    name: "ADR 0006: a module importing another module's internal file fails encapsulation",
    folder: 'profile',
    source: `import { returnUrlQueryParams } from '../auth/internal/return-url';\nexport const fixture = returnUrlQueryParams;\n`,
    lintErrors: ['@softarc/sheriff/encapsulation'],
  },
  {
    name: "ADR 0007: the app routes' module importing a Baseline page fails encapsulation",
    folder: '.',
    source: `import { SignIn } from './auth/internal/sign-in/sign-in';\nexport const fixture = SignIn;\n`,
    lintErrors: ['@softarc/sheriff/encapsulation'],
  },
  {
    name: "ADR 0005: a Baseline module importing auth's public guard passes",
    folder: 'profile',
    source: `import { signedInGuard } from '../auth/auth-guards';\nexport const fixture = signedInGuard;\n`,
    lintErrors: [],
  },
  {
    name: 'ADR 0005: a Feature importing a Baseline module passes',
    folder: throwawayFeature,
    source: `import { ProfileData } from '../../profile/profile-data';\nexport const fixture = ProfileData;\n`,
    lintErrors: [],
  },
  {
    name: 'Component templates standard: an 11-line inline template fails the inline-declarations limit',
    folder: 'profile',
    source: componentWithInlineTemplate(11),
    lintErrors: ['@angular-eslint/component-max-inline-declarations'],
  },
  {
    name: 'Component templates standard: a 10-line inline template passes',
    folder: 'profile',
    source: componentWithInlineTemplate(10),
    lintErrors: [],
  },
];

const fixtures = cases.map((lintCase, index) => {
  const extension = lintCase.isSpec ? '.spec.ts' : '.ts';
  const path = join(appFolder, lintCase.folder, `lint-fixture-${runId}-${index}${extension}`);
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

describe('lint rules', () => {
  const ruleIdsByPath = new Map<string, (string | null)[]>();

  beforeAll(async () => {
    await writeFixtures();
    const results = await new ESLint({ cwd: repoRoot }).lintFiles(fixtures.map(({ path }) => path));
    for (const { filePath, messages } of results) {
      ruleIdsByPath.set(
        filePath,
        messages.map(({ ruleId }) => ruleId),
      );
    }
  });

  afterAll(async () => {
    await removeFixtures();
  });

  for (const { name, path, lintErrors } of fixtures) {
    it(name, () => {
      expect(ruleIdsByPath.get(path)).toEqual(lintErrors);
    });
  }
});
