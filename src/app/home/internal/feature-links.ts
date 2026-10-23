import { InjectionToken } from '@angular/core';
import { featureRoutes } from '../../features/features.routes';

/** The Features home links to. A token so tests can render home with no Features. */
export const FEATURE_LINKS = new InjectionToken<readonly { path: string; title: string }[]>(
  'FEATURE_LINKS',
  { providedIn: 'root', factory: () => featureRoutes },
);
