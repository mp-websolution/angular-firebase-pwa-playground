import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/** Loads the start page afresh. A token so tests, which cannot navigate, can replace it. */
export const LOAD_START_PAGE = new InjectionToken<() => void>('LOAD_START_PAGE', {
  providedIn: 'root',
  factory: () => {
    const { location } = inject(DOCUMENT);
    return () => location.assign('/');
  },
});
