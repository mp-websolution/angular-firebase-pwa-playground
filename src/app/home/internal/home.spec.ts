import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { appIdentity } from '../../../app-identity/app-identity';
import { featureRoutes } from '../../features/features.routes';
import { FakeAuthSession } from '../../testing/fake-auth-session';
import { renderApp } from '../../testing/render-app';

describe('Home', () => {
  it('shows who is signed in', async () => {
    await renderApp('/', { session: new FakeAuthSession({ signedInAs: 'ada@example.com' }) });

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('links to every Feature by its title in the Features navigation, in route list order', async () => {
    await renderApp('/', { session: new FakeAuthSession({ signedInAs: 'ada@example.com' }) });

    const features = await screen.findByRole('navigation', { name: 'Features' });
    const links = within(features).getAllByRole('link');

    expect(links).toHaveLength(featureRoutes.length);
    featureRoutes.forEach(({ title, path }, i) => {
      expect(links[i]).toHaveAccessibleName(title);
      expect(links[i]).toHaveAttribute('href', `/${path}`);
    });
  });

  it('signs out and returns to sign-in', async () => {
    await renderApp('/', { session: new FakeAuthSession({ signedInAs: 'ada@example.com' }) });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('keeps the user signed in and asks to close other tabs when they block sign-out', async () => {
    await renderApp('/', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com', otherTabsOpen: true }),
    });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Close the app in your other tabs, then sign out again.',
    );
    expect(screen.getByText('Signed in as ada@example.com')).toBeVisible();
  });

  it("is headed and titled with the app identity's name", async () => {
    await renderApp('/', { session: new FakeAuthSession({ signedInAs: 'ada@example.com' }) });

    expect(await screen.findByRole('heading', { level: 1, name: appIdentity.name })).toBeVisible();
    expect(document.title).toBe(appIdentity.name);
  });
});
