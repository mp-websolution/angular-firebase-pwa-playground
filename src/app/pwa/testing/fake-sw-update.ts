import type { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';

// `implements SwUpdate` would also demand its private fields; this keeps only the public ones.
type PublicApi<T> = { [K in keyof T]: T[K] };

/** An in-memory stand-in for Angular's `SwUpdate`, driven by the test like a deploy would drive it. */
export class FakeSwUpdate implements PublicApi<SwUpdate> {
  readonly #versionUpdates = new Subject<VersionEvent>();
  readonly #unrecoverable = new Subject<UnrecoverableStateEvent>();
  #version = 1;

  readonly isEnabled = true;
  readonly versionUpdates = this.#versionUpdates.asObservable();
  readonly unrecoverable = this.#unrecoverable.asObservable();

  /** A new version is deployed, and the service worker has downloaded it. */
  deployNewVersion(): void {
    const currentVersion = { hash: `v${this.#version}` };
    const latestVersion = { hash: `v${++this.#version}` };
    this.#versionUpdates.next({ type: 'VERSION_DETECTED', version: latestVersion });
    this.#versionUpdates.next({ type: 'VERSION_READY', currentVersion, latestVersion });
  }

  /** The version serving this tab broke, e.g. its files are gone from the server and the cache. */
  breakCurrentVersion(): void {
    this.#unrecoverable.next({
      type: 'UNRECOVERABLE_STATE',
      reason: 'Failed to retrieve hashed resource from the server.',
    });
  }

  async checkForUpdate(): Promise<boolean> {
    return false;
  }

  async activateUpdate(): Promise<boolean> {
    return false;
  }
}
