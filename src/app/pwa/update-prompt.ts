import { Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { RELOAD_PAGE } from '../browser/reload-page';

/** Tells the user about a new or broken app version, and reloads only when they say so. */
@Component({
  selector: 'app-update-prompt',
  template: `
    <!-- Always rendered, so screen readers announce the prompt when it appears inside. -->
    <div aria-live="polite">
      @if (prompt() === 'new-version') {
        <div
          class="fixed inset-x-4 bottom-4 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded border border-slate-300 bg-white p-4 shadow-lg"
        >
          <p class="flex-1">A new version is available.</p>
          <button
            type="button"
            class="rounded bg-slate-900 px-4 py-2 font-medium text-white"
            (click)="reloadPage()"
          >
            Reload
          </button>
          <button
            type="button"
            class="rounded border border-slate-300 px-4 py-2 font-medium"
            (click)="dismissed.set(true)"
          >
            Later
          </button>
        </div>
      }
    </div>
    @if (prompt() === 'broken') {
      <div
        role="alert"
        class="fixed inset-x-4 bottom-4 mx-auto flex max-w-md flex-wrap items-center gap-3 rounded border border-slate-300 bg-white p-4 shadow-lg"
      >
        <p class="flex-1">This version of the app stopped working. Reload to get the latest one.</p>
        <button
          type="button"
          class="rounded bg-slate-900 px-4 py-2 font-medium text-white"
          (click)="reloadPage()"
        >
          Reload
        </button>
      </div>
    }
  `,
})
export class UpdatePrompt {
  readonly #swUpdate = inject(SwUpdate);
  protected readonly reloadPage = inject(RELOAD_PAGE);

  // Reloading is enough to switch: the service worker serves the latest version to a fresh page.
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
}
