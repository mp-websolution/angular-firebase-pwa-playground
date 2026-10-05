import { render } from '@testing-library/angular';
import { Routes } from '@angular/router';
import { App } from '../app';
import { routes } from '../app.routes';
import { AuthSession } from '../auth/auth-session';
import { FakeAuthSession } from '../auth/testing/fake-auth-session';
import { ProfileData } from '../profile/profile-data';
import { FakeProfileData } from '../profile/testing/fake-profile-data';

export interface RenderAppOptions {
  /** Replaces the profile data service; defaults to a profile without a display name. */
  profile?: FakeProfileData;
  /** Go before the app's own routes, e.g. to stand in for pages that don't exist yet. */
  extraRoutes?: Routes;
}

/** Renders the whole app through the router at `url`, with its data-access services faked in memory. */
export async function renderApp(
  url: string,
  session = new FakeAuthSession(),
  { profile = new FakeProfileData(), extraRoutes = [] }: RenderAppOptions = {},
) {
  const result = await render(App, {
    routes: [...extraRoutes, ...routes],
    providers: [
      { provide: AuthSession, useValue: session },
      { provide: ProfileData, useValue: profile },
    ],
  });
  await result.navigate(url);
  return result;
}
