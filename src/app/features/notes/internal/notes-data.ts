import { Service, computed, inject, signal, untracked } from '@angular/core';
import {
  QueryDocumentSnapshot,
  collection,
  deleteDoc,
  doc,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AuthSession } from '../../../auth/auth-session';
import { injectLiveData } from '../../../live-data/inject-live-data';
import { Note, NotesFilter } from './note.model';

interface StoredNote {
  id: string;
  text: string;
  authorUid: string;
}

@Service()
export class NotesData {
  readonly #session = inject(AuthSession);
  readonly #filter = signal<NotesFilter>('all');
  // Sorted in `map`, not with orderBy: with the author filter that needs a composite index.
  readonly #live = injectLiveData({
    refFor: (firestore) => collection(firestore, 'notes'),
    listenTo: (notesRef) => {
      const authorUid =
        this.#filter() === 'mine'
          ? this.#uidWithoutRelisteningWhenSignOutShutsFirestore()
          : undefined;
      return authorUid ? query(notesRef, where('authorUid', '==', authorUid)) : notesRef;
    },
    map: (snapshot): StoredNote[] =>
      [...snapshot.docs].sort(newestFirst).map((note) => ({
        id: note.id,
        text: note.get('text'),
        authorUid: note.get('authorUid'),
      })),
  });

  readonly notes = computed((): Note[] | undefined => {
    const uid = this.#session.user()?.uid;
    return this.#live.value()?.map(({ id, text, authorUid }) => ({
      id,
      text,
      mine: uid !== undefined && authorUid === uid,
    }));
  });
  readonly filter = this.#filter.asReadonly();
  readonly loading = this.#live.loading;
  readonly waitingToSync = this.#live.waitingToSync;
  readonly loadFailed = this.#live.loadFailed;

  setFilter(filter: NotesFilter): void {
    this.#filter.set(filter);
  }

  #uidWithoutRelisteningWhenSignOutShutsFirestore(): string | undefined {
    return untracked(() => this.#session.user()?.uid);
  }

  async create(text: string): Promise<void> {
    this.#live.track(
      setDoc(doc(await this.#live.ref()), {
        text,
        authorUid: this.#session.user()?.uid,
        createdAt: serverTimestamp(),
      }),
    );
  }

  async update(id: string, text: string): Promise<void> {
    this.#live.track(updateDoc(doc(await this.#live.ref(), id), { text }));
  }

  async delete(id: string): Promise<void> {
    this.#live.track(deleteDoc(doc(await this.#live.ref(), id)));
  }
}

function newestFirst(a: QueryDocumentSnapshot, b: QueryDocumentSnapshot): number {
  const aCreated = creationTimeCountingOneWaitingForTheServerAsNewest(a);
  const bCreated = creationTimeCountingOneWaitingForTheServerAsNewest(b);
  return aCreated === bCreated ? 0 : bCreated - aCreated;
}

function creationTimeCountingOneWaitingForTheServerAsNewest(note: QueryDocumentSnapshot): number {
  return note.get('createdAt')?.toMillis() ?? Number.POSITIVE_INFINITY;
}
