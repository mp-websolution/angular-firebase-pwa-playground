import { Route } from '@angular/router';

type FeatureRoute = Route & { path: string; title: string };

/**
 * Where the Baseline meets the Features: one lazy route area per Feature, each kept out of the
 * initial bundle and titled with its page title. `startPage` is the one Feature at `/`, with its
 * whole route tree at the root; `featureRoutes` holds the others, each at its own path. Removing
 * a Feature removes its entry here, and removing the start page points `startPage` at another
 * Feature first (see docs/features.md).
 */
export const startPage: Route = {
  loadChildren: () => import('./notes/notes.routes').then((m) => m.notesRoutes),
  title: 'Notes',
};

export const featureRoutes: FeatureRoute[] = [];
