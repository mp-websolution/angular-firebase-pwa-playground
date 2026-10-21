import { Routes } from '@angular/router';
import { signedOutGuard } from './auth/auth-guards';
import { SignIn } from './auth/sign-in/sign-in';
import { SignUp } from './auth/sign-up/sign-up';
import { homeRoutes } from './home/home.routes';
import { profileRoutes } from './profile/profile.routes';
import { featureRoutes } from './features/features.routes';

export const routes: Routes = [
  ...homeRoutes,
  ...profileRoutes,
  { path: 'sign-in', component: SignIn, canActivate: [signedOutGuard], title: 'Sign in' },
  { path: 'sign-up', component: SignUp, canActivate: [signedOutGuard], title: 'Create account' },
  ...featureRoutes,
  { path: '**', redirectTo: '' },
];
