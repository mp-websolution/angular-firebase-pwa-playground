import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const releaseTag = /^baseline-v(\d+)\.(\d+)\.(\d+)$/;

/** The file groups and the Template's repository name, from `scripts/file-groups.json`. */
export const fileGroups = JSON.parse(
  await readFile(new URL('file-groups.json', import.meta.url), 'utf8'),
);

/** Whether `tag` names a Baseline release, `baseline-vX.Y.Z`. */
export function isReleaseTag(tag) {
  return releaseTag.test(tag ?? '');
}

/** Sorts Baseline release tags by version, oldest first: negative when `a` is older than `b`. */
export function byVersion(a, b) {
  const [aVersion, bVersion] = [a, b].map((tag) => tag.match(releaseTag).slice(1).map(Number));
  return aVersion.map((part, index) => part - bVersion[index]).find((diff) => diff !== 0) ?? 0;
}

/** The newest Baseline release tag reachable from HEAD, or `undefined` when there is none. */
export function newestReleaseReachableFromHead() {
  return git('tag', '--merged', 'HEAD', '--list', 'baseline-v*')
    .stdout.split('\n')
    .filter(isReleaseTag)
    .sort(byVersion)
    .at(-1);
}

/** Runs git in the working directory; never throws, so callers check `status`. */
export function git(...args) {
  const { status, stdout, stderr } = spawnSync('git', args, { encoding: 'utf8' });
  return { status, stdout: stdout.trimEnd(), stderr };
}
