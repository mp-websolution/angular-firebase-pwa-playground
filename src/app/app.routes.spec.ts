import { Component } from '@angular/core';
import { screen } from '@testing-library/angular';
import { FakeAuthSession } from './testing/fake-auth-session';
import { renderApp } from './testing/render-app';
import { standInStartPage } from './testing/stand-in-start-page';

@Component({ template: '<h1>Start page child</h1>' })
class StartPageChild {}

function startPageWithRootChildren(...paths: string[]) {
  return {
    title: 'Start page',
    loadChildren: vi.fn(async () => paths.map((path) => ({ path, component: StartPageChild }))),
  };
}

describe('app routes', () => {
  it('opens the start page at /, titled by its title', async () => {
    await renderApp('/', { startPage: standInStartPage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Start page' })).toBeVisible();
    expect(document.title).toBe('Start page');
  });

  it.each([
    ['/sign-in', 'Sign in', () => new FakeAuthSession()],
    ['/profile', 'Profile', () => new FakeAuthSession({ signedInAs: 'ada@example.com' })],
  ])(
    'opens the Baseline page at %s, not a start page child at the same path, without loading the start page',
    async (url, heading, session) => {
      const startPage = startPageWithRootChildren('sign-in', 'profile');

      await renderApp(url, { session: session(), startPage });

      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeVisible();
      expect(startPage.loadChildren).not.toHaveBeenCalled();
    },
  );

  it('opens the start page for a URL nothing matches', async () => {
    await renderApp('/no-such-page', { startPage: standInStartPage });

    expect(await screen.findByRole('heading', { level: 1, name: 'Start page' })).toBeVisible();
  });
});
