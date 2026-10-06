import { Routes } from '@angular/router';
import { signedInGuard } from '../auth/auth-guards';
import { Notes } from './notes';

/** The notes Prototype's pages, below `/notes`, all for signed-in users only. */
export const notesRoutes: Routes = [{ path: '', component: Notes, canActivate: [signedInGuard] }];
