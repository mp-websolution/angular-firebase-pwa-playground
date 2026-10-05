import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FakeAuthSession } from '../auth/testing/fake-auth-session';
import { renderApp } from '../testing/render-app';

describe('Home', () => {
  it('shows who is signed in', async () => {
    await renderApp('/', new FakeAuthSession({ signedInAs: 'ada@example.com' }));

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('signs out and returns to sign-in', async () => {
    await renderApp('/', new FakeAuthSession({ signedInAs: 'ada@example.com' }));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('keeps the user signed in and asks to close other tabs when they block sign-out', async () => {
    await renderApp(
      '/',
      new FakeAuthSession({ signedInAs: 'ada@example.com', otherTabsOpen: true }),
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Close the app in your other tabs, then sign out again.',
    );
    expect(screen.getByText('Signed in as ada@example.com')).toBeVisible();
  });
});
