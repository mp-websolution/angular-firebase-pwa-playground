import { LoadChildren, Routes } from '@angular/router';
import { authRoutes } from './auth/auth.routes';
import { profileRoutes } from './profile/profile.routes';
import { featureRoutes, startPage } from './features/features.routes';

export interface StartPage {
  title: string;
  loadChildren: LoadChildren;
}

/** The app's routes with `start` at `/`; tests pass a stand-in start page. */
export function routesWithStartPage(start: StartPage): Routes {
  return [
    ...profileRoutes,
    ...authRoutes,
    ...featureRoutes,
    // Last, so every other path wins a clash and its chunk loads only when nothing else matched (ADR 0009).
    { path: '', ...start },
    { path: '**', redirectTo: '' },
  ];
}

export const routes = routesWithStartPage(startPage);
