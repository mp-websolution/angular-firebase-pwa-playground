import { signal } from '@angular/core';
import type { NotesData } from '../notes-data';
import { Note } from '../note.model';

// `implements NotesData` would also demand its `#private` fields; this keeps only the public ones.
type PublicApi<T> = { [K in keyof T]: T[K] };

export interface FakeNotesDataOptions {
  /** The texts of the notes stored before the test starts, newest first. */
  notes?: string[];
  /** The notes can't be loaded, e.g. Firestore refused to read them. */
  loadFails?: boolean;
}

/** An in-memory stand-in for `NotesData` that behaves like Firestore for component tests. */
export class FakeNotesData implements PublicApi<NotesData> {
  readonly #notes = signal<Note[] | undefined>(undefined);
  readonly #loadFailed = signal(false);

  readonly notes = this.#notes.asReadonly();
  readonly loadFailed = this.#loadFailed.asReadonly();

  constructor({ notes = [], loadFails = false }: FakeNotesDataOptions = {}) {
    if (loadFails) {
      this.#loadFailed.set(true);
    } else {
      this.#notes.set(notes.map((text) => ({ id: crypto.randomUUID(), text })));
    }
  }

  /** Stores a new note as if the user created it on another device or in another tab. */
  createElsewhere(text: string): void {
    this.#notes.update((notes = []) => [{ id: crypto.randomUUID(), text }, ...notes]);
  }

  async create(text: string): Promise<void> {
    this.createElsewhere(text);
  }

  async update(id: string, text: string): Promise<void> {
    this.#notes.update((notes) => notes?.map((note) => (note.id === id ? { id, text } : note)));
  }

  async delete(id: string): Promise<void> {
    this.#notes.update((notes) => notes?.filter((note) => note.id !== id));
  }
}
