import { render } from '@testing-library/angular';
import { Routes } from '@angular/router';
import { App } from '../app';
import { routes } from '../app.routes';
import { AuthSession } from '../auth/auth-session';
import { FakeAuthSession } from '../auth/testing/fake-auth-session';

/**
 * Renders the whole app through the router at `url`, with the auth session faked in memory.
 * `extraRoutes` go before the app's own, e.g. to stand in for pages that don't exist yet.
 */
export async function renderApp(
  url: string,
  session = new FakeAuthSession(),
  extraRoutes: Routes = [],
) {
  const result = await render(App, {
    routes: [...extraRoutes, ...routes],
    providers: [{ provide: AuthSession, useValue: session }],
  });
  await result.navigate(url);
  return result;
}
