import { Component, DOCUMENT, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { RELOAD_PAGE } from '../browser/reload-page';

@Component({
  selector: 'app-update-prompt',
  host: { '(document:visibilitychange)': 'checkForUpdateWhenTheUserReturns()' },
  templateUrl: './update-prompt.html',
})
export class UpdatePrompt {
  readonly #swUpdate = inject(SwUpdate);
  readonly #document = inject(DOCUMENT);
  protected readonly reloadIntoTheLatestVersion = inject(RELOAD_PAGE);

  readonly #readyVersion = toSignal(
    this.#swUpdate.versionUpdates.pipe(
      filter((event) => event.type === 'VERSION_READY'),
      map((event) => event.latestVersion.hash),
    ),
  );
  readonly #broken = toSignal(this.#swUpdate.unrecoverable.pipe(map(() => true)), {
    initialValue: false,
  });
  protected readonly dismissedUntilTheNextVersion = linkedSignal({
    source: this.#readyVersion,
    computation: () => false,
  });

  protected readonly prompt = computed(() => {
    if (this.#broken()) {
      return 'broken';
    }
    return this.#readyVersion() && !this.dismissedUntilTheNextVersion() ? 'new-version' : 'none';
  });

  constructor() {
    this.#checkForUpdate();
  }

  protected checkForUpdateWhenTheUserReturns(): void {
    if (this.#document.visibilityState === 'visible') {
      this.#checkForUpdate();
    }
  }

  #checkForUpdate(): void {
    if (this.#swUpdate.isEnabled) {
      this.#swUpdate.checkForUpdate().catch(leaveAFailedCheckToTheNextOne);
    }
  }
}

function leaveAFailedCheckToTheNextOne(): undefined {
  return undefined;
}
