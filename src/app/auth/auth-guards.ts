import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';
import { returnUrlQueryParams } from './internal/return-url';

export const signedInGuard: CanActivateFn = async (_route, { url }) => {
  const router = inject(Router);
  const session = inject(AuthSession);
  await session.whenResolved();
  if (session.user()) {
    return true;
  }
  return router.createUrlTree(['/sign-in'], { queryParams: returnUrlQueryParams(url) });
};
