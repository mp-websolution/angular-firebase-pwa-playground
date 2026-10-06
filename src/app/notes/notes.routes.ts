import { Routes } from '@angular/router';
import { signedInGuard } from '../auth/auth-guards';
import { NotesPage } from './notes-page/notes-page';

/** The notes Prototype's pages, below `/notes`, all for signed-in users only. */
export const notesRoutes: Routes = [
  { path: '', component: NotesPage, canActivate: [signedInGuard] },
];
