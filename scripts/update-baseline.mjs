import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const upgradeNotesFile = 'docs/upgrade-notes.md';
const releaseTag = /^baseline-v(\d+)\.(\d+)\.(\d+)$/;

const release = process.argv[2];
const branch = `merge-${release}`;

const pushAndOpenPr =
  'push the branch and the tag and open a PR:\n' +
  `  git push -u origin ${branch}\n` +
  `  git push origin ${release}`;

refuseUnlessReleaseTag(release);
await refuseWithoutUpstream();
refuseWithUncommittedChanges();
refuseWhenBranchExists(branch);
const mergedRelease = newestReleaseReachableFromHead();
fetchOnlyTheReleaseTag(release);
printUpgradeNotes(mergedRelease, release);
git('switch', '--quiet', '-c', branch);
mergeOrStopOnConflicts(release);
console.log(
  `Merged ${release} into the new branch ${branch}. Do what the upgrade notes above say, then ${pushAndOpenPr}`,
);

function refuseUnlessReleaseTag(tag) {
  if (!releaseTag.test(tag ?? '')) {
    refuse(
      'Give a Baseline release tag of the form baseline-vX.Y.Z: npm run baseline:update -- baseline-v1.2.0',
    );
  }
}

async function refuseWithoutUpstream() {
  if (git('remote', 'get-url', 'upstream').status !== 0) {
    const { templateRepository } = JSON.parse(
      await readFile(new URL('file-groups.json', import.meta.url), 'utf8'),
    );
    refuse(
      'This repo has no "upstream" remote. Add the Template as one:\n' +
        `  git remote add upstream https://github.com/${templateRepository}.git`,
    );
  }
}

function refuseWithUncommittedChanges() {
  const changes = git('status', '--porcelain').stdout;
  if (changes) {
    refuse(`The working tree has uncommitted changes. Commit or stash them first:\n${changes}`);
  }
}

function refuseWhenBranchExists(name) {
  if (git('rev-parse', '--verify', '--quiet', `refs/heads/${name}`).status === 0) {
    refuse(`Branch ${name} exists already. Delete it or finish merging there.`);
  }
}

function mergeOrStopOnConflicts(tag) {
  const merge = git(
    'merge',
    '--quiet',
    '--no-ff',
    '--no-edit',
    '-m',
    `Merge Baseline release ${tag}`,
    tag,
  );
  if (merge.status === 0) {
    return;
  }
  const conflicts = git('diff', '--name-only', '--diff-filter=U').stdout;
  if (!conflicts) {
    refuse(`The merge of ${tag} failed:\n${merge.stderr}`);
  }
  refuse(
    `The merge of ${tag} stopped on conflicts in:\n${indented(conflicts)}\n` +
      `Resolve them, git add them and git commit. Then ${pushAndOpenPr}`,
  );
}

function indented(lines) {
  return lines
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function newestReleaseReachableFromHead() {
  const tags = git('tag', '--merged', 'HEAD', '--list', 'baseline-v*').stdout.split('\n');
  return tags
    .filter((tag) => releaseTag.test(tag))
    .sort(byVersion)
    .at(-1);
}

function byVersion(a, b) {
  const [aVersion, bVersion] = [a, b].map((tag) => tag.match(releaseTag).slice(1).map(Number));
  return aVersion.map((part, index) => part - bVersion[index]).find((diff) => diff !== 0) ?? 0;
}

function fetchOnlyTheReleaseTag(tag) {
  if (git('fetch', '--quiet', '--no-tags', 'upstream', 'tag', tag).status !== 0) {
    refuse(`upstream has no Baseline release ${tag}.`);
  }
}

function printUpgradeNotes(from, to) {
  const notes = git('show', `${to}:${upgradeNotesFile}`).stdout;
  const entries = releaseEntries(notes).filter(
    ({ tag }) => byVersion(tag, to) <= 0 && (!from || byVersion(tag, from) > 0),
  );
  console.log(
    from
      ? `Upgrade notes from ${from} to ${to} (${upgradeNotesFile}):\n`
      : `Upgrade notes up to ${to} (${upgradeNotesFile}), as no Baseline release is merged yet:\n`,
  );
  console.log(entries.map(({ text }) => text).join('\n'));
}

function releaseEntries(notes) {
  const lines = notes.split('\n');
  const start = lines.indexOf('## Releases') + 1;
  const end = lines.findIndex((line, index) => index >= start && /^#{1,2} /.test(line));
  const entries = [];
  for (const line of lines.slice(start, end === -1 ? undefined : end)) {
    const tag = line.match(/^### (\S+)\s*$/)?.[1];
    if (tag && releaseTag.test(tag)) {
      entries.push({ tag, lines: [line] });
    } else {
      entries.at(-1)?.lines.push(line);
    }
  }
  return entries.map(({ tag, lines }) => ({ tag, text: `${lines.join('\n').trimEnd()}\n` }));
}

function refuse(message) {
  console.error(message);
  process.exit(1);
}

function git(...args) {
  const { status, stdout, stderr } = spawnSync('git', args, { encoding: 'utf8' });
  return { status, stdout: stdout.trimEnd(), stderr };
}
