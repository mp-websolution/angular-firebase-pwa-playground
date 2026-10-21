import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthSession } from '../auth-session';

export const signedOutGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = inject(AuthSession);
  await session.whenResolved();
  return session.user() ? router.createUrlTree(['/']) : true;
};
