import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { homeRoutes } from './home/home.routes';
import { profileRoutes } from './profile/profile.routes';
import { featureRoutes } from './features/features.routes';

export const routes: Routes = [
  ...homeRoutes,
  ...profileRoutes,
  ...authRoutes,
  ...featureRoutes,
  { path: '**', redirectTo: '' },
];
