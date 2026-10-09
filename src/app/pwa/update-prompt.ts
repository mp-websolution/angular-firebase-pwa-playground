import { Component, DOCUMENT, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { RELOAD_PAGE } from '../browser/reload-page';

/** Tells the user about a new or broken app version, and reloads only when they say so. */
@Component({
  selector: 'app-update-prompt',
  host: { '(document:visibilitychange)': 'checkForUpdateIfVisible()' },
  templateUrl: './update-prompt.html',
})
export class UpdatePrompt {
  readonly #swUpdate = inject(SwUpdate);
  readonly #document = inject(DOCUMENT);
  // Reloading is enough to switch: the service worker serves the latest version to a fresh page.
  protected readonly reloadPage = inject(RELOAD_PAGE);

  readonly #readyVersion = toSignal(
    this.#swUpdate.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map((event) => event.latestVersion.hash),
    ),
  );
  readonly #broken = toSignal(this.#swUpdate.unrecoverable.pipe(map(() => true)), {
    initialValue: false,
  });
  /** "Later" hides the prompt until the next version is ready. */
  protected readonly dismissed = linkedSignal({
    source: this.#readyVersion,
    computation: () => false,
  });

  protected readonly prompt = computed(() => {
    if (this.#broken()) {
      return 'broken';
    }
    return this.#readyVersion() && !this.dismissed() ? 'new-version' : 'none';
  });

  constructor() {
    this.#checkForUpdate();
  }

  // The service worker checks by itself only on page loads, so an installed app left open for days
  // would never hear of a new version. Coming back to it is a good moment to look.
  protected checkForUpdateIfVisible(): void {
    if (this.#document.visibilityState === 'visible') {
      this.#checkForUpdate();
    }
  }

  #checkForUpdate(): void {
    // Disabled in development. A failed check (e.g. offline) changes nothing: the next one retries.
    if (this.#swUpdate.isEnabled) {
      this.#swUpdate.checkForUpdate().catch(() => undefined);
    }
  }
}
