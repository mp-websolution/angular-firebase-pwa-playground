import type { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeSwUpdateOptions {
  /** Downloading a new version takes until `finishDownload()` instead of being done right away. */
  slowDownload?: boolean;
  /** Update checks fail as if offline, until `goOnline()`. */
  offline?: boolean;
}

export class FakeSwUpdate implements PublicApi<SwUpdate> {
  readonly #versionUpdates = new Subject<VersionEvent>();
  readonly #unrecoverable = new Subject<UnrecoverableStateEvent>();
  readonly #slowDownload: boolean;
  #offline: boolean;
  readonly #versionTheTabRunsUntilItReloads = 1;
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

  deployNewVersion(): void {
    this.#deployedVersion++;
  }

  finishDownload(): void {
    this.#finishDownload?.();
  }

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
    const currentVersion = { hash: `v${this.#versionTheTabRunsUntilItReloads}` };
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
