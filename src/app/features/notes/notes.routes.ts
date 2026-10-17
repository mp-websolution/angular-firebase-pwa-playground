import { Routes } from '@angular/router';
import { signedInGuard } from '../../auth/auth-guards';
import { Notes } from './internal/notes';

export const notesRoutes: Routes = [{ path: '', component: Notes, canActivate: [signedInGuard] }];
