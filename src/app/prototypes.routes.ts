import { Route } from '@angular/router';

/** A Prototype's route area. Home links to it, named by its title. */
type PrototypeRoute = Route & { path: string; title: string };

/**
 * Where the Baseline meets the Prototypes: one lazy route area per Prototype, each kept out of the
 * initial bundle. Removing a Prototype removes its entry here (see docs/prototypes.md).
 */
export const prototypeRoutes: PrototypeRoute[] = [
  {
    path: 'notes',
    loadChildren: () => import('./notes/notes.routes').then((m) => m.notesRoutes),
    title: 'Notes',
  },
];
