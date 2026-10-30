import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GitFixtures } from './git-fixtures';

const checkBaselineDrift = resolve(import.meta.dirname, '../scripts/check-baseline-drift.mjs');
const updateBaseline = resolve(import.meta.dirname, '../scripts/update-baseline.mjs');
const fixtures = new GitFixtures(join(import.meta.dirname, '.fixtures/check-baseline-drift'));

let template: string;

async function templateWithTwoReleases(): Promise<string> {
  const repo = await fixtures.init('template');
  await fixtures.commit(
    repo,
    {
      'src/greeting.ts': "export const greeting = 'hi';\n",
      'src/farewell.ts': "export const farewell = 'bye';\n",
      'README.md': '# Template\n',
      'package.json': '{ "name": "template" }\n',
    },
    'First release',
  );
  fixtures.git(repo, 'tag', 'baseline-v1.0.0');
  fixtures.git(repo, 'tag', 'v1.0.0');
  await fixtures.commit(
    repo,
    { 'src/greeting.ts': "export const greeting = 'hello';\n" },
    'Say hello',
  );
  fixtures.git(repo, 'tag', '-a', '-m', 'Baseline release 1.1.0', 'baseline-v1.1.0');
  return repo;
}

describe('checking for Baseline drift (npm run baseline:check-drift)', () => {
  beforeAll(async () => {
    await fixtures.clear();
    template = await templateWithTwoReleases();
  });

  afterAll(async () => {
    await fixtures.clear();
  });

  it('passes when only Feature, Project-owned and shared files changed since the release', async () => {
    const project = await fixtures.cloneProject(template, 'passes', 'baseline-v1.0.0');
    await fixtures.commit(
      project,
      {
        'src/app/features/todo/todo.routes.ts': 'export const todoRoutes = [];\n',
        'src/app/features/features.routes.ts': 'export const featureRoutes = [];\n',
        'scripts/seed/feature-todo.mjs': 'export {};\n',
        'src/app-identity/app-identity.ts': "export const appName = 'Todo';\n",
        'README.md': '# Todo\n',
        'docs/project/later.md': '# Later\n',
        'package.json': '{ "name": "template", "dependencies": {} }\n',
      },
      'Build the todo Project',
    );

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(stdout).toBe('No Baseline drift since baseline-v1.0.0.\n');
  });

  it('ignores specs and tickets under .scratch', async () => {
    const project = await fixtures.cloneProject(template, 'scratch', 'baseline-v1.0.0');
    await fixtures.commit(
      project,
      { '.scratch/todo/spec.md': '# Spec: Todo\n' },
      'Spec the todo Feature',
    );

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(stdout).toBe('No Baseline drift since baseline-v1.0.0.\n');
  });

  it('fails naming each Baseline file added, changed or deleted since the release, and only those', async () => {
    const project = await fixtures.cloneProject(template, 'fails', 'baseline-v1.0.0');
    await fixtures.commit(
      project,
      {
        'src/greeting.ts': "export const greeting = 'hey';\n",
        'src/farewell.ts': null,
        'docs/todo.md': '# Todo\n',
        'src/app/features/todo/todo.routes.ts': 'export const todoRoutes = [];\n',
        'README.md': '# Todo\n',
      },
      'Change Baseline files',
    );

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(status).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toBe(
      'Baseline drift since baseline-v1.0.0: these Baseline files differ from the release.\n' +
        '  added    docs/todo.md\n' +
        '  deleted  src/farewell.ts\n' +
        '  changed  src/greeting.ts\n' +
        'Only the Template changes Baseline files. Revert these changes, ' +
        'or make them in the Template and merge them with a Baseline release.\n',
    );
  });

  it('compares against the newest release reachable from HEAD after merging a second one', async () => {
    const project = await fixtures.cloneProject(template, 'second-merge', 'baseline-v1.0.0');
    expect(fixtures.run(updateBaseline, project, 'baseline-v1.1.0').status).toBe(0);
    await fixtures.commit(
      project,
      { 'src/farewell.ts': "export const farewell = 'ciao';\n" },
      'Change a Baseline file',
    );

    const { status, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(status).toBe(1);
    expect(stderr).toContain(
      'Baseline drift since baseline-v1.1.0: these Baseline files differ from the release.\n' +
        '  changed  src/farewell.ts\n' +
        'Only the Template',
    );
  });

  it("fails with git's error when the files changed since the release can't be listed", async () => {
    const project = await fixtures.cloneProject(template, 'diff-fails', 'baseline-v1.0.0');
    await fixtures.commit(project, { 'README.md': '# Todo\n' }, 'Name the Project');
    const releaseTree = fixtures.git(project, 'rev-parse', 'baseline-v1.0.0^{tree}');
    await rm(join(project, '.git/objects', releaseTree.slice(0, 2), releaseTree.slice(2)));

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(status).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toMatch(
      /^Could not list the files changed since baseline-v1\.0\.0, so Baseline drift cannot be checked\.\nfatal: .+\n$/,
    );
    expect(stderr).toContain(releaseTree);
  });

  it("fails with git's error when the releases reachable from HEAD can't be listed", async () => {
    const project = await fixtures.cloneProject(template, 'tags-fail', 'baseline-v1.0.0');
    fixtures.git(project, 'checkout', '--quiet', '--orphan', 'unborn');

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(status).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toMatch(
      /^Could not list the Baseline releases reachable from HEAD\.\nfatal: .+\n$/,
    );
  });

  it('fails clearly when no Baseline release is reachable from HEAD', async () => {
    const project = await fixtures.cloneProject(template, 'no-release', 'baseline-v1.0.0');
    fixtures.git(project, 'tag', '--delete', 'baseline-v1.0.0');
    fixtures.git(project, 'tag', 'v1.0.0');

    const { status, stdout, stderr } = fixtures.run(checkBaselineDrift, project);

    expect(status).toBe(1);
    expect(stdout).toBe('');
    expect(stderr).toBe(
      'No Baseline release (a baseline-vX.Y.Z tag) is reachable from HEAD, so Baseline drift cannot be checked.\n' +
        'A Project needs the Template history it was cloned with, and the tag of the Baseline release it merged last:\n' +
        '  git push origin baseline-vX.Y.Z\n' +
        'In CI, check out with full history and tags.\n',
    );
  });
});
