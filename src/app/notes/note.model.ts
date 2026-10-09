export interface Note {
  id: string;
  text: string;
}

// Same limit as the Firestore rules, which see the trimmed text.
export const maxNoteLength = 1000;
