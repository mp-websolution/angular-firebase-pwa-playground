import { Service } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { injectLiveData } from '../firebase/inject-live-data';
import { Note } from './note.model';

/**
 * The signed-in user's notes, kept up to date, plus the commands that change them. Imports the
 * Firestore SDK, so only the notes routes may reach it (ADR 0003).
 */
@Service()
export class NotesData {
  readonly #live = injectLiveData({
    refFor: (firestore, uid) => collection(firestore, 'users', uid, 'notes'),
    // A note created on this device sorts first while its server timestamp is still pending.
    listenTo: (notesRef) => query(notesRef, orderBy('createdAt', 'desc')),
    map: (snapshot): Note[] =>
      snapshot.docs.map((note) => ({ id: note.id, text: note.get('text') })),
  });

  /** The signed-in user's notes, newest first; `undefined` until they have loaded. */
  readonly notes = this.#live.value;
  /** True while changes made on this device can't reach the server, e.g. offline. */
  readonly waitingToSync = this.#live.waitingToSync;
  /** True when the notes can't be loaded, e.g. Firestore refused to read them. */
  readonly loadFailed = this.#live.loadFailed;

  /**
   * Saves a new note on this device and syncs it in the background, so it also works offline:
   * `notes` shows it straight away.
   */
  async create(text: string): Promise<void> {
    this.#live.track(setDoc(doc(await this.#live.ref()), { text, createdAt: serverTimestamp() }));
  }

  /** Changes a note's text on this device and syncs it in the background, like `create`. */
  async update(id: string, text: string): Promise<void> {
    this.#live.track(updateDoc(doc(await this.#live.ref(), id), { text }));
  }

  /** Deletes a note on this device and syncs it in the background, like `create`. */
  async delete(id: string): Promise<void> {
    this.#live.track(deleteDoc(doc(await this.#live.ref(), id)));
  }
}
