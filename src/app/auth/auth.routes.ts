import { Routes } from '@angular/router';
import { SignIn } from './internal/sign-in/sign-in';
import { passwordListedGuard } from './internal/sign-in-methods';
import { signedOutGuard } from './internal/signed-out-guard';
import { SignUp } from './internal/sign-up/sign-up';

export const authRoutes: Routes = [
  { path: 'sign-in', component: SignIn, canActivate: [signedOutGuard], title: 'Sign in' },
  {
    path: 'sign-up',
    component: SignUp,
    canMatch: [passwordListedGuard],
    canActivate: [signedOutGuard],
    title: 'Create account',
  },
];
