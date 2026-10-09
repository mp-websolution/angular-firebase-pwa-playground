import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './auth/auth-guards';
import { SignIn } from './auth/sign-in/sign-in';
import { SignUp } from './auth/sign-up/sign-up';
import { Home } from './home/home';
import { prototypeRoutes } from './prototypes.routes';

export const routes: Routes = [
  {
    path: '',
    component: Home,
    canActivate: [signedInGuard],
    title: 'Angular Firebase PWA Playground',
  },
  {
    path: 'profile',
    // Lazy, or the Firestore SDK joins the initial bundle.
    loadComponent: () => import('./profile/edit-profile/edit-profile').then((m) => m.EditProfile),
    canActivate: [signedInGuard],
    title: 'Profile',
  },
  { path: 'sign-in', component: SignIn, canActivate: [signedOutGuard], title: 'Sign in' },
  { path: 'sign-up', component: SignUp, canActivate: [signedOutGuard], title: 'Create account' },
  ...prototypeRoutes,
  { path: '**', redirectTo: '' },
];
