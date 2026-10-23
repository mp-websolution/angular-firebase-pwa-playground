import { matchesGlob } from 'node:path/posix';
import { fileGroups, git, newestReleaseReachableFromHead } from './baseline-releases.mjs';

const notBaselinePatterns = [
  ...fileGroups.feature,
  ...fileGroups.projectOwned,
  ...fileGroups.shared,
].map(({ pattern }) => pattern);
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
