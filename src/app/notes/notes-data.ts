import { DestroyRef, ErrorHandler, Service, inject, signal } from '@angular/core';
import {
  CollectionReference,
  Unsubscribe,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AuthSession } from '../auth/auth-session';
import { FIRESTORE } from '../firebase/provide-firebase';
import { Note } from './note.model';

/**
 * The signed-in user's notes, kept up to date, plus the commands that change them. Imports the
 * Firestore SDK, so only the notes routes may reach it (ADR 0003).
 */
@Service()
export class NotesData {
  readonly #loadFirestore = inject(FIRESTORE);
  readonly #errorHandler = inject(ErrorHandler);
  // The notes pages are guarded, so someone is signed in. Whenever that user goes away, the page
  // reloads (see AuthSession), so the uid never changes for this instance.
  readonly #uid = inject(AuthSession).user()?.uid;
  readonly #notes = signal<Note[] | undefined>(undefined);
  readonly #loadFailed = signal(false);

  /** The signed-in user's notes, newest first; `undefined` until they have loaded. */
  readonly notes = this.#notes.asReadonly();
  /** True when the notes can't be loaded, e.g. Firestore refused to read them. */
  readonly loadFailed = this.#loadFailed.asReadonly();

  constructor() {
    let unsubscribe: Unsubscribe | undefined;
    let destroyed = false;
    inject(DestroyRef).onDestroy(() => {
      destroyed = true;
      unsubscribe?.();
    });
    const fail = (error: unknown) => {
      this.#loadFailed.set(true);
      this.#errorHandler.handleError(error);
    };
    this.#notesRef().then((notesRef) => {
      if (destroyed) {
        return;
      }
      // A note created on this device sorts first while its server timestamp is still pending.
      unsubscribe = onSnapshot(
        query(notesRef, orderBy('createdAt', 'desc')),
        (snapshot) => {
          this.#notes.set(snapshot.docs.map((note) => ({ id: note.id, text: note.get('text') })));
        },
        (error) => {
          // Sign-out, here or in another tab, shuts Firestore down and reloads the page: nothing failed.
          if (error.code !== 'aborted') {
            fail(error);
          }
        },
      );
    }, fail);
  }

  /**
   * Saves a new note on this device and syncs it in the background, so it also works offline:
   * `notes` shows it straight away.
   */
  async create(text: string): Promise<void> {
    const notesRef = await this.#notesRef();
    // Not awaited: offline, it would only settle once back online.
    setDoc(doc(notesRef), { text, createdAt: serverTimestamp() }).catch((error: unknown) => {
      this.#reportRejected(error);
    });
  }

  /** Changes a note's text on this device and syncs it in the background, like `create`. */
  async update(id: string, text: string): Promise<void> {
    const notesRef = await this.#notesRef();
    updateDoc(doc(notesRef, id), { text }).catch((error: unknown) => {
      this.#reportRejected(error);
    });
  }

  /** Deletes a note on this device and syncs it in the background, like `create`. */
  async delete(id: string): Promise<void> {
    const notesRef = await this.#notesRef();
    deleteDoc(doc(notesRef, id)).catch((error: unknown) => {
      this.#reportRejected(error);
    });
  }

  #reportRejected(error: unknown): void {
    // The page only sends what the rules accept, so a rejection is a bug. Firestore has already
    // undone the change, so `notes` shows what the server kept.
    this.#errorHandler.handleError(error);
  }

  async #notesRef(): Promise<CollectionReference> {
    if (!this.#uid) {
      throw new Error('NotesData needs a signed-in user.');
    }
    return collection(await this.#loadFirestore(), 'users', this.#uid, 'notes');
  }
}
