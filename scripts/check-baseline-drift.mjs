import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { matchesGlob } from 'node:path/posix';

const fileGroups = JSON.parse(await readFile(new URL('file-groups.json', import.meta.url), 'utf8'));
const notBaselinePatterns = [
  ...fileGroups.feature,
  ...fileGroups.projectOwned,
  ...fileGroups.shared,
].map(({ pattern }) => pattern);
const releaseTag = /^baseline-v\d+\.\d+\.\d+$/;
const changeNames = { A: 'added', M: 'changed', T: 'changed', D: 'deleted' };

const release = newestReleaseReachableFromHead();
if (!release) {
  fail(
    'No Baseline release (a baseline-vX.Y.Z tag) is reachable from HEAD, so Baseline drift cannot be checked.\n' +
      'A Project needs the Template history it was cloned with, and the tag of the Baseline release it merged last:\n' +
      '  git push origin baseline-vX.Y.Z\n' +
      'In CI, check out with full history and tags.',
  );
}
const drift = changedFilesSince(release).filter(({ path }) => isBaselineFile(path));

if (drift.length > 0) {
  fail(
    `Baseline drift since ${release}: these Baseline files differ from the release.\n` +
      drift.map(({ status, path }) => `  ${changeNames[status].padEnd(8)} ${path}`).join('\n') +
      '\nOnly the Template changes Baseline files. Revert these changes, ' +
      'or make them in the Template and merge them with a Baseline release.',
  );
}
console.log(`No Baseline drift since ${release}.`);

function newestReleaseReachableFromHead() {
  return git('tag', '--merged', 'HEAD', '--sort=-version:refname', '--list', 'baseline-v*')
    .stdout.split('\n')
    .find((tag) => releaseTag.test(tag));
}

function changedFilesSince(tag) {
  return git('diff', '--name-status', '--no-renames', tag, 'HEAD')
    .stdout.split('\n')
    .filter(Boolean)
    .map((line) => {
      const [status, path] = line.split('\t');
      return { status, path };
    });
}

function isBaselineFile(path) {
  return !notBaselinePatterns.some((pattern) => matchesGlob(path, pattern));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(...args) {
  const { status, stdout, stderr } = spawnSync('git', args, { encoding: 'utf8' });
  return { status, stdout: stdout.trimEnd(), stderr };
}
