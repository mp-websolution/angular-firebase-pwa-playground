import { Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { profileRoutes } from './profile/profile.routes';
import { StartPage, featureRoutes, startPage } from './features/features.routes';

export type { StartPage };

/**
 * The app's routes with `start` at `/`; tests pass a stand-in start page. The start page goes last, so
 * every other path wins a clash and its chunk loads only when nothing else matched (ADR 0009).
 */
export function routesWithStartPage(start: StartPage): Routes {
  return [
    ...profileRoutes,
    ...authRoutes,
    ...featureRoutes,
    { ...start, path: '' },
    { path: '**', redirectTo: '' },
  ];
}

export const routes = routesWithStartPage(startPage);
