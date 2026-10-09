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

@Service()
export class NotesData {
  readonly #live = injectLiveData({
    refFor: (firestore, uid) => collection(firestore, 'users', uid, 'notes'),
    listenTo: (notesRef) => query(notesRef, orderBy('createdAt', 'desc')),
    map: (snapshot): Note[] =>
      snapshot.docs.map((note) => ({ id: note.id, text: note.get('text') })),
  });

  readonly notes = this.#live.value;
  readonly waitingToSync = this.#live.waitingToSync;
  readonly loadFailed = this.#live.loadFailed;

  async create(text: string): Promise<void> {
    this.#live.track(setDoc(doc(await this.#live.ref()), { text, createdAt: serverTimestamp() }));
  }

  async update(id: string, text: string): Promise<void> {
    this.#live.track(updateDoc(doc(await this.#live.ref(), id), { text }));
  }

  async delete(id: string): Promise<void> {
    this.#live.track(deleteDoc(doc(await this.#live.ref(), id)));
  }
}
