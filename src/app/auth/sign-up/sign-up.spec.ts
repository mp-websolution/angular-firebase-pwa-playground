import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../testing/render-app';
import { FakeAuthSession } from '../testing/fake-auth-session';

async function signUp(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignUp', () => {
  it('creates an account and opens home', async () => {
    await renderApp('/sign-up');

    await signUp('grace@example.com', 'correct-horse');

    expect(await screen.findByText('Signed in as grace@example.com')).toBeVisible();
  });

  it('says so when the email is already in use', async () => {
    await renderApp(
      '/sign-up',
      new FakeAuthSession({ accounts: [{ email: 'grace@example.com', password: 'other-horse' }] }),
    );

    await signUp('grace@example.com', 'correct-horse');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in instead.',
    );
  });

  it('says so when the password is too weak', async () => {
    await renderApp('/sign-up');

    await signUp('grace@example.com', '123');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a password with at least 6 characters.',
    );
  });
});
