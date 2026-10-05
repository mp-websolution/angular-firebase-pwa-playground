import { assertInInjectionContext, inject } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';

const returnUrlParam = 'returnUrl';

/** Query params that send the user back to `url` after sign-in; none for home. */
export function returnUrlQueryParams(url: string): Params {
  return url === '/' ? {} : { [returnUrlParam]: url };
}

/** The page `signedInGuard` turned the user away from, or home. */
export function injectReturnUrl(): string {
  assertInInjectionContext(injectReturnUrl);
  // Safe to follow as is: the router only navigates within the app, unknown paths lead home.
  return inject(ActivatedRoute).snapshot.queryParamMap.get(returnUrlParam) ?? '/';
}
