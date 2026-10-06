import { Routes } from '@angular/router';
import { NotesPage } from './notes-page/notes-page';

/** The notes Prototype's pages, below `/notes`. Guarded where they're registered. */
export const notesRoutes: Routes = [{ path: '', component: NotesPage }];
