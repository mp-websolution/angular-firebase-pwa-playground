import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';
import { returnUrlQueryParams } from './return-url';

/** Lets signed-in users through; sends everyone else to sign-in, remembering where they were going. */
export const signedInGuard: CanActivateFn = async (_route, { url }) => {
  const router = inject(Router);
  const session = inject(AuthSession);
  await session.whenResolved();
  if (session.user()) {
    return true;
  }
  return router.createUrlTree(['/sign-in'], { queryParams: returnUrlQueryParams(url) });
};

/** Keeps signed-in users away from sign-in and sign-up by sending them home. */
export const signedOutGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(AuthSession);
  await session.whenResolved();
  return session.user() ? router.createUrlTree(['/']) : true;
};
