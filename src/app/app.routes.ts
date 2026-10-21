import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './auth/auth-guards';
import { SignIn } from './auth/sign-in/sign-in';
import { SignUp } from './auth/sign-up/sign-up';
import { homeRoutes } from './home/home.routes';
import { featureRoutes } from './features/features.routes';

export const routes: Routes = [
  ...homeRoutes,
  {
    path: 'profile',
    // Lazy, or the Firestore SDK joins the initial bundle.
    loadComponent: () => import('./profile/edit-profile/edit-profile').then((m) => m.EditProfile),
    canActivate: [signedInGuard],
    title: 'Profile',
  },
  { path: 'sign-in', component: SignIn, canActivate: [signedOutGuard], title: 'Sign in' },
  { path: 'sign-up', component: SignUp, canActivate: [signedOutGuard], title: 'Create account' },
  ...featureRoutes,
  { path: '**', redirectTo: '' },
];
