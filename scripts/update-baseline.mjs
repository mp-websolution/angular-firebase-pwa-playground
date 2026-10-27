import {
  baselineConfig,
  git,
  isReleaseTag,
  newestReleaseReachableFromHead,
  sortReleaseTagsByVersionAsc,
} from './baseline-releases.mjs';

const upgradeNotesFile = 'docs/upgrade-notes.md';

const release = process.argv[2];
const branch = `merge-${release}`;

const pushAndOpenPrSteps =
  'push the branch and the tag and open a PR:\n' +
  `  git push -u origin ${branch}\n` +
  `  git push origin ${release}\n` +
  "Only a repo admin can push the tag. If you aren't one, ask one to push it, then re-run the PR's checks: " +
  'its Baseline drift check fails until the tag is on origin.';

refuseUnlessReleaseTag(release);
refuseWithoutUpstream();
refuseWithUncommittedChanges();
refuseWhenBranchExists(branch);
const mergedRelease = newestReleaseReachableFromHead();
refuseUnlessNewerThanMerged(release, mergedRelease);
fetchOnlyReleaseTag(release);
printUpgradeNotes(mergedRelease, release);
git('switch', '--quiet', '-c', branch);
mergeOrStopOnConflicts(release);
console.log(
  `Merged ${release} into the new branch ${branch}. Do what the upgrade notes above say, then ${pushAndOpenPrSteps}`,
);

function refuseUnlessReleaseTag(tag) {
  if (!isReleaseTag(tag)) {
    refuse(
      'Give a Baseline release tag of the form baseline-vX.Y.Z: npm run baseline:update -- baseline-v1.2.0',
    );
  }
}

function refuseWithoutUpstream() {
  if (git('remote', 'get-url', 'upstream').status !== 0) {
    refuse(
      'This repo has no "upstream" remote. Add the Template as one:\n' +
        `  git remote add upstream https://github.com/${baselineConfig.templateRepository}.git`,
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

function refuseUnlessNewerThanMerged(tag, merged) {
  if (merged && sortReleaseTagsByVersionAsc(tag, merged) <= 0) {
    refuse(
      `${tag} is not newer than ${merged}, the newest Baseline release merged already. Nothing to merge.`,
    );
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
      `Resolve them, git add them and git commit. Then ${pushAndOpenPrSteps}`,
  );
}

function indented(lines) {
  return lines
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

function fetchOnlyReleaseTag(tag) {
  const { status, stderr } = git('fetch', '--quiet', '--no-tags', 'upstream', 'tag', tag);
  if (status !== 0) {
    refuse(`Could not fetch Baseline release ${tag} from upstream:\n${stderr.trimEnd()}`);
  }
}

function printUpgradeNotes(from, to) {
  const notes = git('show', `${to}:${upgradeNotesFile}`).stdout;
  const entries = releaseEntries(notes).filter(
    ({ tag }) =>
      sortReleaseTagsByVersionAsc(tag, to) <= 0 &&
      (!from || sortReleaseTagsByVersionAsc(tag, from) > 0),
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
    if (isReleaseTag(tag)) {
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
