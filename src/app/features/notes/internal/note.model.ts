export interface Note {
  id: string;
  text: string;
  mine: boolean;
}

export type NotesFilter = 'all' | 'mine';

// Keep in step with the Firestore rules, which check the trimmed text.
export const maxNoteLength = 1000;
