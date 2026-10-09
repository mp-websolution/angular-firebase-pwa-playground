import { Route } from '@angular/router';

type PrototypeRoute = Route & { path: string; title: string };

/**
 * Where the Baseline meets the Prototypes: one lazy route area per Prototype, each kept out of the
 * initial bundle and linked from home by its title. Removing a Prototype removes its entry here
 * (see docs/prototypes.md).
 */
export const prototypeRoutes: PrototypeRoute[] = [
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.routes').then((m) => m.notesRoutes),
    title: 'Notes',
  },
];
