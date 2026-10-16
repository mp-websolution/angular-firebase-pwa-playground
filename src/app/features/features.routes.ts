import { Route } from '@angular/router';

type FeatureRoute = Route & { path: string; title: string };

/**
 * Where the Baseline meets the Features: one lazy route area per Feature, each kept out of the
 * initial bundle and linked from home by its title. Removing a Feature removes its entry here
 * (see docs/features.md).
 */
export const featureRoutes: FeatureRoute[] = [
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.routes').then((m) => m.notesRoutes),
    title: 'Notes',
  },
];
