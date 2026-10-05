import { Injector, effect, inject } from '@angular/core';
import { ActivatedRoute, CanActivateFn, Router } from '@angular/router';
import { AuthSession } from './auth-session';

const returnUrlParam = 'returnUrl';

/** Lets signed-in users through; sends everyone else to sign-in, remembering where they were going. */
export const signedInGuard: CanActivateFn = async (_route, { url }) => {
  const router = inject(Router);
  const session = await resolvedSession();
  if (session.user()) {
    return true;
  }
  const queryParams = url === '/' ? {} : { [returnUrlParam]: url };
  return router.createUrlTree(['/sign-in'], { queryParams });
};

/** Keeps signed-in users away from sign-in and sign-up by sending them home. */
export const signedOutGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const session = await resolvedSession();
  return session.user() ? router.createUrlTree(['/']) : true;
};

/** The page `signedInGuard` turned the user away from, or home. Call in an injection context. */
export function injectReturnUrl(): string {
  // Safe to follow as is: the router only navigates within the app, unknown paths lead home.
  return inject(ActivatedRoute).snapshot.queryParamMap.get(returnUrlParam) ?? '/';
}

/** Waits until Auth knows whether someone is signed in. Call in an injection context. */
function resolvedSession(): Promise<AuthSession> {
  const session = inject(AuthSession);
  if (session.resolved()) {
    return Promise.resolve(session);
  }
  const injector = inject(Injector);
  return new Promise((resolve) => {
    const watcher = effect(
      () => {
        if (session.resolved()) {
          watcher.destroy();
          resolve(session);
        }
      },
      { injector },
    );
  });
}
