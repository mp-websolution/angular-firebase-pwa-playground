import { Routes } from '@angular/router';
import { signedInGuard } from '../auth/auth-guards';
import { Home } from './internal/home';

export const homeRoutes: Routes = [
  {
    path: '',
    component: Home,
    canActivate: [signedInGuard],
    title: 'Angular Firebase PWA Playground',
  },
];
