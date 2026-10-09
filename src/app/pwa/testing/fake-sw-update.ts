import type { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

// `implements SwUpdate` would also demand its private fields; this keeps only the public ones.
type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeSwUpdateOptions {
  /** Downloading a new version takes until `finishDownload()` instead of being done right away. */
  slowDownload?: boolean;
  /** Update checks fail as if offline, until `goOnline()`. */
  offline?: boolean;
}

/** An in-memory stand-in for Angular's `SwUpdate`, driven by the test like a deploy would drive it. */
export class FakeSwUpdate implements PublicApi<SwUpdate> {
  readonly #versionUpdates = new Subject<VersionEvent>();
  readonly #unrecoverable = new Subject<UnrecoverableStateEvent>();
  readonly #slowDownload: boolean;
  #offline: boolean;
  /** The tab keeps running the version it loaded until it reloads, which tests can't do. */
  readonly #tabVersion = 1;
  #foundVersion = 1;
  #deployedVersion = 1;
  #finishDownload?: () => void;

  readonly isEnabled = true;
  readonly versionUpdates = this.#versionUpdates.asObservable();
  readonly unrecoverable = this.#unrecoverable.asObservable();

  constructor({ slowDownload = false, offline = false }: FakeSwUpdateOptions = {}) {
    this.#slowDownload = slowDownload;
    this.#offline = offline;
  }

  /** A new version goes live on the server. The app finds it on its next update check. */
  deployNewVersion(): void {
    this.#deployedVersion++;
  }

  /** Ends the download started by an update check with the `slowDownload` option. */
  finishDownload(): void {
    this.#finishDownload?.();
  }

  /** The version serving this tab broke, e.g. its files are gone from the server and the cache. */
  breakCurrentVersion(): void {
    this.#unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Failed to retrieve hashed resource from the server.',
    });
  }

  goOnline(): void {
    this.#offline = false;
  }

  async checkForUpdate(): Promise<boolean> {
    if (this.#offline) {
      throw new Error('Failed to fetch');
    }
    if (this.#deployedVersion === this.#foundVersion) {
      return false;
    }
    this.#foundVersion = this.#deployedVersion;
    const currentVersion = { hash: `v${this.#tabVersion}` };
    const latestVersion = { hash: `v${this.#foundVersion}` };
    this.#versionUpdates.next({ type: 'VERSION_DETECTED', version: latestVersion });
    if (this.#slowDownload) {
      await new Promise<void>((resolve) => (this.#finishDownload = resolve));
    }
    this.#versionUpdates.next({ type: 'VERSION_READY', currentVersion, latestVersion });
    return true;
  }

  async activateUpdate(): Promise<boolean> {
    return false;
  }
}
