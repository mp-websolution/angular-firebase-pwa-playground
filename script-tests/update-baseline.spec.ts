import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GitFixtures } from './git-fixtures';

const updateBaseline = resolve(import.meta.dirname, '../scripts/update-baseline.mjs');
const fixtures = new GitFixtures(join(import.meta.dirname, '.fixtures/update-baseline'));

const upgradeNotesEntries = {
  'baseline-v1.0.0':
    '### baseline-v1.0.0\n\nThe first Baseline release.\n\n**Project action:** None.\n',
  'baseline-v1.1.0':
    '### baseline-v1.1.0\n\nThe greeting says hello.\n\n**Project action:** None.\n',
  'baseline-v2.0.0':
    '### baseline-v2.0.0\n\nThe greeting says goodbye.\n\n**Project action:**\n\n- Say goodbye in `README.md`.\n',
};

function upgradeNotes(...releases: (keyof typeof upgradeNotesEntries)[]): string {
  return [
    '# Baseline upgrade notes',
    '## Entry format',
    '### baseline-v1.1.0\n\nA format example, never printed.\n',
    '## Releases',
    ...releases.reverse().map((release) => upgradeNotesEntries[release]),
  ].join('\n\n');
}

let template: string;

async function templateWithReleasesAndDeployTags(): Promise<string> {
  const repo = await fixtures.init('template');
  await fixtures.commit(
    repo,
    {
      'src/greeting.ts': "export const greeting = 'hi';\n",
      'docs/upgrade-notes.md': upgradeNotes('baseline-v1.0.0'),
    },
    'First release',
  );
  fixtures.git(repo, 'tag', 'baseline-v1.0.0');
  fixtures.git(repo, 'tag', 'v1.0.0');
  await fixtures.commit(
    repo,
    {
      'src/greeting.ts': "export const greeting = 'hello';\n",
      'docs/upgrade-notes.md': upgradeNotes('baseline-v1.0.0', 'baseline-v1.1.0'),
    },
    'Say hello',
  );
  fixtures.git(repo, 'tag', '-a', '-m', 'Baseline release 1.1.0', 'baseline-v1.1.0');
  fixtures.git(repo, 'tag', 'v1.1.0');
  await fixtures.commit(
    repo,
    {
      'src/greeting.ts': "export const greeting = 'goodbye';\n",
      'docs/upgrade-notes.md': upgradeNotes(
        'baseline-v1.0.0',
        'baseline-v1.1.0',
        'baseline-v2.0.0',
      ),
    },
    'Say goodbye',
  );
  fixtures.git(repo, 'tag', '-a', '-m', 'Baseline release 2.0.0', 'baseline-v2.0.0');
  fixtures.git(repo, 'tag', 'v1.2.0');
  return repo;
}

async function projectWithFeature(name: string): Promise<string> {
  const project = await fixtures.cloneProject(template, name, 'baseline-v1.0.0');
  await fixtures.commit(
    project,
    { 'src/app/features/todo/todo.routes.ts': 'export const todoRoutes = [];\n' },
    'Add the todo Feature',
  );
  return project;
}

describe('merging a Baseline release (npm run baseline:update -- baseline-vX.Y.Z)', () => {
  beforeAll(async () => {
    await fixtures.clear();
    template = await templateWithReleasesAndDeployTags();
  });

  afterAll(async () => {
    await fixtures.clear();
  });

  it('merges the release with a merge commit on a new branch named after it', async () => {
    const project = await projectWithFeature('merges-on-new-branch');
    const projectMain = fixtures.git(project, 'rev-parse', 'main');

    const { status, stderr } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('merge-baseline-v1.1.0');
    expect(fixtures.git(project, 'rev-list', '--parents', '-n', '1', 'HEAD').split(' ')).toEqual([
      fixtures.git(project, 'rev-parse', 'HEAD'),
      projectMain,
      fixtures.git(template, 'rev-parse', 'baseline-v1.1.0^{commit}'),
    ]);
    expect(fixtures.git(project, 'show', 'HEAD:src/greeting.ts')).toBe(
      "export const greeting = 'hello';",
    );
    expect(fixtures.git(project, 'rev-parse', 'main')).toBe(projectMain);
  });

  it('fetches only the asked release tag: no deploy tag and no other Baseline release', async () => {
    const project = await projectWithFeature('fetches-one-tag');

    expect(fixtures.run(updateBaseline, project, 'baseline-v2.0.0').status).toBe(0);

    expect(fixtures.git(project, 'tag', '--list').split('\n')).toEqual([
      'baseline-v1.0.0',
      'baseline-v2.0.0',
    ]);
  });

  it("prints the release's upgrade notes entries after the newest release already merged, newest first", async () => {
    const project = await projectWithFeature('prints-upgrade-notes');

    const { stdout } = fixtures.run(updateBaseline, project, 'baseline-v2.0.0');

    expect(stdout).toContain(
      'Upgrade notes from baseline-v1.0.0 to baseline-v2.0.0 (docs/upgrade-notes.md):\n\n' +
        upgradeNotesEntries['baseline-v2.0.0'] +
        '\n' +
        upgradeNotesEntries['baseline-v1.1.0'],
    );
    expect(stdout).not.toContain('The first Baseline release.');
    expect(stdout).not.toContain('A format example');
  });

  it('prints every upgrade notes entry up to the release when no release is merged yet', async () => {
    const project = await projectWithFeature('prints-all-upgrade-notes');
    fixtures.git(project, 'tag', '--delete', 'baseline-v1.0.0');

    const { stdout } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(stdout).toContain(
      'Upgrade notes up to baseline-v1.1.0 (docs/upgrade-notes.md), as no Baseline release is merged yet:\n\n' +
        upgradeNotesEntries['baseline-v1.1.0'] +
        '\n' +
        upgradeNotesEntries['baseline-v1.0.0'],
    );
  });

  it.each([
    ['a deploy tag', 'v1.1.0'],
    ['a version without patch number', 'baseline-v1.1'],
    ['no tag at all', undefined],
  ])('refuses %s, asking for a Baseline release tag', async (_, argument) => {
    const project = await projectWithFeature(`refuses-${argument ?? 'no-tag'}`);

    const { status, stderr } = fixtures.run(
      updateBaseline,
      project,
      ...(argument ? [argument] : []),
    );

    expect(status).toBe(1);
    expect(stderr).toContain(
      'Give a Baseline release tag of the form baseline-vX.Y.Z: npm run baseline:update -- baseline-v1.2.0',
    );
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('main');
  });

  it('refuses without an upstream remote, saying how to add the Template as one', async () => {
    const project = await projectWithFeature('refuses-without-upstream');
    fixtures.git(project, 'remote', 'remove', 'upstream');

    const { status, stderr } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(status).toBe(1);
    expect(stderr).toContain(
      'This repo has no "upstream" remote. Add the Template as one:\n' +
        '  git remote add upstream https://github.com/mp-websolution/angular-firebase-pwa-playground.git',
    );
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('main');
  });

  it('refuses with uncommitted changes, listing them', async () => {
    const project = await projectWithFeature('refuses-dirty-tree');
    await fixtures.write(project, { 'src/greeting.ts': "export const greeting = 'hey';\n" });

    const { status, stderr } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(status).toBe(1);
    expect(stderr).toContain(
      'The working tree has uncommitted changes. Commit or stash them first:\n M src/greeting.ts',
    );
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('main');
    expect(fixtures.git(project, 'tag', '--list')).toBe('baseline-v1.0.0');
  });

  it('refuses a release the upstream remote does not have', async () => {
    const project = await projectWithFeature('refuses-unknown-release');

    const { status, stderr } = fixtures.run(updateBaseline, project, 'baseline-v3.0.0');

    expect(status).toBe(1);
    expect(stderr).toContain('upstream has no Baseline release baseline-v3.0.0.');
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('main');
  });

  it("refuses when the release's branch exists already", async () => {
    const project = await projectWithFeature('refuses-existing-branch');
    fixtures.git(project, 'branch', 'merge-baseline-v1.1.0');
    const projectMain = fixtures.git(project, 'rev-parse', 'main');

    const { status, stderr } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(status).toBe(1);
    expect(stderr).toContain(
      'Branch merge-baseline-v1.1.0 exists already. Delete it or finish merging there.',
    );
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('main');
    expect(fixtures.git(project, 'rev-parse', 'main')).toBe(projectMain);
  });

  it('stops on conflicts, listing the conflicting files and leaving the merge to finish', async () => {
    const project = await projectWithFeature('stops-on-conflict');
    await fixtures.commit(
      project,
      { 'src/greeting.ts': "export const greeting = 'hey';\n" },
      'Change a Baseline file',
    );

    const { status, stdout, stderr } = fixtures.run(updateBaseline, project, 'baseline-v1.1.0');

    expect(status).toBe(1);
    expect(stdout).toContain(upgradeNotesEntries['baseline-v1.1.0']);
    expect(stderr).toContain(
      'The merge of baseline-v1.1.0 stopped on conflicts in:\n  src/greeting.ts\n',
    );
    expect(stderr).toContain(
      'Resolve them, git add them and git commit. Then push the branch and the tag and open a PR:\n' +
        '  git push -u origin merge-baseline-v1.1.0\n' +
        '  git push origin baseline-v1.1.0\n' +
        'Only a repo admin can push the tag.',
    );
    expect(fixtures.git(project, 'branch', '--show-current')).toBe('merge-baseline-v1.1.0');
    expect(fixtures.git(project, 'rev-parse', 'MERGE_HEAD^{commit}')).toBe(
      fixtures.git(template, 'rev-parse', 'baseline-v1.1.0^{commit}'),
    );
  });

  it('never pushes, and ends by saying to push the branch and the tag and open a PR, and that only a repo admin can push the tag', async () => {
    const project = await projectWithFeature('never-pushes');
    const originBefore = fixtures.git(project, 'ls-remote', 'origin');

    const { stdout } = fixtures.run(updateBaseline, project, 'baseline-v2.0.0');

    expect(fixtures.git(project, 'ls-remote', 'origin')).toBe(originBefore);
    expect(stdout).toMatch(
      /Merged baseline-v2\.0\.0 into the new branch merge-baseline-v2\.0\.0\. Do what the upgrade notes above say, then push the branch and the tag and open a PR:\n {2}git push -u origin merge-baseline-v2\.0\.0\n {2}git push origin baseline-v2\.0\.0\nOnly a repo admin can push the tag. If you aren't one, ask one to push it, then re-run the PR's checks: its Baseline drift check fails until the tag is on origin\.\n$/,
    );
  });
});
