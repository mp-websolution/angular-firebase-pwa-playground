import { computed, signal } from '@angular/core';
import type { NotesData } from '../notes-data';
import { Note, NotesFilter } from '../note.model';

type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeNotesDataOptions {
  /**
   * The notes stored before the test starts, newest first. A text alone is the signed-in user's
   * own note; `{ text, mine: false }` is someone else's.
   */
  notes?: (string | { text: string; mine: false })[];
  /** Changes stay on this device, as if offline, so they keep waiting to sync. */
  offline?: boolean;
  /** The notes can't be loaded, e.g. Firestore refused to read them. */
  loadFails?: boolean;
  /** The first load, and each one after a filter switch, stays loading until `finishLoading()`. */
  slowLoading?: boolean;
}

export class FakeNotesData implements PublicApi<NotesData> {
  readonly #stored = signal<Note[]>([]);
  readonly #filter = signal<NotesFilter>('all');
  readonly #loadedFilter = signal<NotesFilter | undefined>(undefined);
  readonly #waitingToSync = signal(false);
  readonly #loadFailed = signal(false);

  readonly notes = computed(() => {
    const loadedFilter = this.#loadedFilter();
    if (!loadedFilter) {
      return undefined;
    }
    return this.#stored().filter((note) => loadedFilter === 'all' || note.mine);
  });
  readonly filter = this.#filter.asReadonly();
  readonly loading = computed(() => !this.#loadFailed() && this.#loadedFilter() !== this.#filter());
  readonly waitingToSync = this.#waitingToSync.asReadonly();
  readonly loadFailed = this.#loadFailed.asReadonly();

  readonly #offline: boolean;
  readonly #slowLoading: boolean;

  constructor({
    notes = [],
    offline = false,
    loadFails = false,
    slowLoading = false,
  }: FakeNotesDataOptions = {}) {
    this.#stored.set(
      notes.map((note) =>
        typeof note === 'string'
          ? { id: crypto.randomUUID(), text: note, mine: true }
          : { id: crypto.randomUUID(), ...note },
      ),
    );
    this.#loadFailed.set(loadFails);
    this.#offline = offline;
    this.#slowLoading = slowLoading;
    if (!loadFails && !slowLoading) {
      this.finishLoading();
    }
  }

  finishLoading(): void {
    this.#loadedFilter.set(this.#filter());
  }

  setFilter(filter: NotesFilter): void {
    this.#filter.set(filter);
    if (!this.#slowLoading) {
      this.finishLoading();
    }
  }

  createElsewhere(text: string): void {
    this.#stored.update((notes) => [{ id: crypto.randomUUID(), text, mine: true }, ...notes]);
  }

  async create(text: string): Promise<void> {
    this.createElsewhere(text);
    this.#waitingToSync.set(this.#offline);
  }

  updateElsewhere(id: string, text: string): void {
    this.#stored.update((notes) =>
      notes.map((note) => (note.id === id ? { ...note, text } : note)),
    );
  }

  async update(id: string, text: string): Promise<void> {
    this.updateElsewhere(id, text);
    this.#waitingToSync.set(this.#offline);
  }

  async delete(id: string): Promise<void> {
    this.#stored.update((notes) => notes.filter((note) => note.id !== id));
    this.#waitingToSync.set(this.#offline);
  }
}
