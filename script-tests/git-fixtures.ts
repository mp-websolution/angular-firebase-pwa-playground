import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/** Repo-relative paths and their contents; `null` deletes the file. */
export type Files = Record<string, string | null>;

export interface ScriptRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Throwaway git repos for script tests, all inside one spec's fixtures folder.
 *
 * Git runs with no user or system config, a fixed identity, no inherited `GIT_*` variables
 * and no repo discovery above the fixtures folder, so it never touches the outer repo.
 * Scripts run through {@link GitFixtures.run} get the same environment.
 */
export class GitFixtures {
  readonly #env: NodeJS.ProcessEnv;

  constructor(readonly folder: string) {
    this.#env = {
      ...withoutGitVariables(process.env),
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      GIT_CEILING_DIRECTORIES: folder,
      GIT_TERMINAL_PROMPT: '0',
      GIT_AUTHOR_NAME: 'Fixture',
      GIT_AUTHOR_EMAIL: 'fixture@example.com',
      GIT_COMMITTER_NAME: 'Fixture',
      GIT_COMMITTER_EMAIL: 'fixture@example.com',
    };
  }

  /** Deletes the fixtures folder: call it in `beforeAll` and `afterAll`. */
  clear(): Promise<void> {
    return rm(this.folder, { recursive: true, force: true });
  }

  /** Runs git in `repo` and returns its trimmed stdout; throws with git's stderr when it fails. */
  git(repo: string, ...args: string[]): string {
    const { status, stdout, stderr } = spawnSync('git', args, {
      cwd: repo,
      env: this.#env,
      encoding: 'utf8',
    });
    if (status !== 0) {
      throw new Error(`git ${args.join(' ')} failed in ${repo}:\n${stderr}`);
    }
    return stdout.trim();
  }

  /** Creates an empty repo on `main` at `<folder>/<name>` and returns its path. */
  async init(name: string): Promise<string> {
    const repo = join(this.folder, name);
    await mkdir(repo, { recursive: true });
    this.git(repo, 'init', '--quiet', '-b', 'main');
    return repo;
  }

  /** Writes or deletes `files` in `repo`, then commits every change in the working tree. */
  async commit(repo: string, files: Files, message: string): Promise<void> {
    await this.write(repo, files);
    this.git(repo, 'add', '--all');
    this.git(repo, 'commit', '--quiet', '-m', message);
  }

  /** Writes or deletes `files` in `repo` without committing. */
  async write(repo: string, files: Files): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
      const file = join(repo, path);
      if (content === null) {
        await rm(file);
      } else {
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, content);
      }
    }
  }

  /**
   * Creates a Project the way the setup steps do: clones `template` with its history but no tags,
   * keeps it as the `upstream` remote, and puts `main` at Baseline release `release`, the only tag
   * it has. Its `origin` is an empty bare repo at `<folder>/<name>-origin.git` with `main` pushed.
   */
  async cloneProject(template: string, name: string, release: string): Promise<string> {
    const project = join(this.folder, name);
    this.git(
      this.folder,
      'clone',
      '--quiet',
      '--no-tags',
      '--origin',
      'upstream',
      template,
      project,
    );
    this.git(project, 'fetch', '--quiet', '--no-tags', 'upstream', 'tag', release);
    this.git(project, 'reset', '--quiet', '--hard', release);
    const origin = join(this.folder, `${name}-origin.git`);
    this.git(this.folder, 'init', '--quiet', '--bare', '-b', 'main', origin);
    this.git(project, 'remote', 'add', 'origin', origin);
    this.git(project, 'push', '--quiet', 'origin', 'main');
    return project;
  }

  /** Runs a Node script with `cwd` as its working directory, as a developer would from the repo root. */
  run(script: string, cwd: string, ...args: string[]): ScriptRun {
    const { status, stdout, stderr } = spawnSync(process.execPath, [script, ...args], {
      cwd,
      env: this.#env,
      encoding: 'utf8',
    });
    return { status, stdout, stderr };
  }
}

function withoutGitVariables(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !name.startsWith('GIT_')));
}
