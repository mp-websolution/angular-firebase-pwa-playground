import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/** Reloads the page. A token so tests, which cannot navigate, can replace it. */
export const RELOAD_PAGE = new InjectionToken<() => void>('RELOAD_PAGE', {
  providedIn: 'root',
  factory: () => {
    const { location } = inject(DOCUMENT);
    return () => location.reload();
  },
});
