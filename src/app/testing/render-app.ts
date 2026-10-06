import { render } from '@testing-library/angular';
import { Routes } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { App } from '../app';
import { routes } from '../app.routes';
import { AuthSession } from '../auth/auth-session';
import { FakeAuthSession } from '../auth/testing/fake-auth-session';
import { RELOAD_PAGE } from '../browser/reload-page';
import { ProfileData } from '../profile/profile-data';
import { FakeProfileData } from '../profile/testing/fake-profile-data';
import { FakeSwUpdate } from '../pwa/testing/fake-sw-update';

export interface RenderAppOptions {
  /** Replaces the profile data service; defaults to a profile without a display name. */
  profile?: FakeProfileData;
  /** Replaces Angular's service-worker update service; defaults to one where no new version comes. */
  swUpdate?: FakeSwUpdate;
  /** Called instead of reloading the page, which tests cannot do; defaults to doing nothing. */
  reloadPage?: () => void;
  /** Go before the app's own routes, e.g. to stand in for pages that don't exist yet. */
  extraRoutes?: Routes;
}

/** Renders the whole app through the router at `url`, with its data-access services faked in memory. */
export async function renderApp(
  url: string,
  session = new FakeAuthSession(),
  {
    profile = new FakeProfileData(),
    swUpdate = new FakeSwUpdate(),
    reloadPage = () => undefined,
    extraRoutes = [],
  }: RenderAppOptions = {},
) {
  const result = await render(App, {
    routes: [...extraRoutes, ...routes],
    providers: [
      { provide: AuthSession, useValue: session },
      { provide: ProfileData, useValue: profile },
      { provide: SwUpdate, useValue: swUpdate },
      { provide: RELOAD_PAGE, useValue: reloadPage },
    ],
  });
  await result.navigate(url);
  return result;
}
