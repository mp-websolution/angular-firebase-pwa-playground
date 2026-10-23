import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const releaseTag = /^baseline-v(\d+)\.(\d+)\.(\d+)$/;

export const baselineConfig = JSON.parse(
  await readFile(new URL('baseline-config.json', import.meta.url), 'utf8'),
);

export function isReleaseTag(tag) {
  return releaseTag.test(tag ?? '');
}

export function sortReleaseTagsByVersionAsc(a, b) {
  const [aVersion, bVersion] = [a, b].map((tag) => tag.match(releaseTag).slice(1).map(Number));
  return aVersion.map((part, index) => part - bVersion[index]).find((diff) => diff !== 0) ?? 0;
}

export function newestReleaseReachableFromHead() {
  return git('tag', '--merged', 'HEAD', '--list', 'baseline-v*')
    .stdout.split('\n')
    .filter(isReleaseTag)
    .sort(sortReleaseTagsByVersionAsc)
    .at(-1);
}

/** Runs git in the working directory; never throws, so callers check `status`. */
export function git(...args) {
  const { status, stdout, stderr } = spawnSync('git', args, { encoding: 'utf8' });
  return { status, stdout: stdout.trimEnd(), stderr };
}
