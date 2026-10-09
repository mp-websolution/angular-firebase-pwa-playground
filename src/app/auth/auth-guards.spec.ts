import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../testing/render-app';
import { signedInGuard } from './auth-guards';
import { Credentials } from './credentials.model';
import { FakeAuthSession } from './testing/fake-auth-session';

@Component({ template: '<h1>Deep page</h1>' })
class DeepPage {}

const deepRoutes: Routes = [
  { path: 'deep/page', component: DeepPage, canActivate: [signedInGuard] },
];
const ada: Credentials = { email: 'ada@example.com', password: 'correct-horse' };

async function fillInCredentials({ email, password }: Credentials) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
}

describe('auth guards', () => {
  it('sends a signed-out user from home to sign-in', async () => {
    await renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('remembers no return URL for home', async () => {
    await renderApp('/');

    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it("waits for the previous visit's session to be restored before deciding", async () => {
    const session = new FakeAuthSession({ restoring: 'ada@example.com' });
    setTimeout(() => session.finishRestoring(), 50);

    await renderApp('/', { session });

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('remembers the requested page in the return URL', async () => {
    await renderApp('/deep/page', { extraRoutes: deepRoutes });

    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/sign-up?returnUrl=%2Fdeep%2Fpage',
    );
  });

  it('returns to the requested page after sign-in', async () => {
    await renderApp('/deep/page?tab=2', {
      session: new FakeAuthSession({ accounts: [ada] }),
      extraRoutes: deepRoutes,
    });

    await fillInCredentials(ada);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Deep page' })).toBeVisible();
  });

  it('returns to the requested page after creating an account instead', async () => {
    const user = userEvent.setup();
    await renderApp('/deep/page', { session: new FakeAuthSession(), extraRoutes: deepRoutes });

    await user.click(await screen.findByRole('link', { name: 'Create one' }));
    await fillInCredentials({ email: 'grace@example.com', password: 'correct-horse' });
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Deep page' })).toBeVisible();
  });

  it.each(['/sign-in', '/sign-up'])('sends a signed-in user from %s to home', async (url) => {
    await renderApp(url, { session: new FakeAuthSession({ signedInAs: 'ada@example.com' }) });

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });
});
