import { Routes } from '@angular/router';
import { signedInGuard } from '../auth/auth-guards';
import { appIdentity } from '../../app-identity/app-identity';
import { Home } from './internal/home';

export const homeRoutes: Routes = [
  {
    path: '',
    component: Home,
    canActivate: [signedInGuard],
    title: appIdentity.name,
  },
];
