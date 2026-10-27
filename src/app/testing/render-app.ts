import { render } from '@testing-library/angular';
import { Provider } from '@angular/core';
import { Route, Routes } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { App } from '../app';
import { routes, routesWithStartPage } from '../app.routes';
import { AuthSession } from '../auth/auth-session';
import { FakeAuthSession } from './fake-auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { SIGN_IN_METHODS } from '../auth/sign-in-methods-token';
import { ProfileData } from '../profile/profile-data';
import { FakeProfileData } from './fake-profile-data';
import { FakeSwUpdate } from './fake-sw-update';

export interface RenderAppOptions {
  /** Replaces the auth session; defaults to a signed-out user. */
  session?: FakeAuthSession;
  /** Replaces the profile data service; defaults to a profile without a display name. */
  profile?: FakeProfileData;
  /** Replaces Angular's service-worker update service; defaults to one where no new version comes. */
  swUpdate?: FakeSwUpdate;
  /** Called instead of reloading the page, which tests cannot do; defaults to doing nothing. */
  reloadPage?: () => void;
  /**
   * Replaces the start page at `/`; defaults to the real one. A Baseline test that lands on `/`
   * passes `standInStartPage`, so it depends on no Feature.
   */
  startPage?: Route;
  /** Go before the app's own routes, e.g. to stand in for pages that don't exist yet. */
  extraRoutes?: Routes;
  /**
   * Go after the fakes above, e.g. a Feature's faked data-access service. Features pass their
   * fakes here instead of getting a default, so the Baseline's tests never depend on them.
   */
  providers?: Provider[];
}

/** Renders the whole app through the router at `url`, with its data-access services faked in memory. */
export async function renderApp(
  url: string,
  {
    session = new FakeAuthSession(),
    profile = new FakeProfileData(),
    swUpdate = new FakeSwUpdate(),
    reloadPage = () => undefined,
    startPage,
    extraRoutes = [],
    providers = [],
  }: RenderAppOptions = {},
) {
  const result = await render(App, {
    routes: [...extraRoutes, ...(startPage ? routesWithStartPage(startPage) : routes)],
    providers: [
      { provide: AuthSession, useValue: session },
      { provide: ProfileData, useValue: profile },
      { provide: SwUpdate, useValue: swUpdate },
      { provide: RELOAD_PAGE, useValue: reloadPage },
      // The Template's methods, so the Baseline's tests pass whichever ones a Project picks.
      { provide: SIGN_IN_METHODS, useValue: ['password', 'google'] },
      ...providers,
    ],
  });
  await result.navigate(url);
  return result;
}
