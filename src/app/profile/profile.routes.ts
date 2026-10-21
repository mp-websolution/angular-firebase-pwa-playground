import { Routes } from '@angular/router';
import { signedInGuard } from '../auth/auth-guards';

export const profileRoutes: Routes = [
  {
    path: 'profile',
    // Lazy, or the Firestore SDK joins the initial bundle.
    loadComponent: () => import('./internal/edit-profile/edit-profile').then((m) => m.EditProfile),
    canActivate: [signedInGuard],
    title: 'Profile',
  },
];
