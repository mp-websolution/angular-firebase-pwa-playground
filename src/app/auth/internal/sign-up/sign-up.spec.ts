import { screen, waitFor } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../testing/render-app';
import { Credentials } from '../../credentials.model';
import { FakeAuthSession } from '../../../testing/fake-auth-session';
import { standInStartPage } from '../../../testing/stand-in-start-page';

async function signUp({ email, password }: Credentials) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignUp', () => {
  it('creates an account and opens the start page', async () => {
    await renderApp('/sign-up', { startPage: standInStartPage });

    await signUp({ email: 'grace@example.com', password: 'correct-horse' });

    expect(await screen.findByText('Signed in as grace@example.com')).toBeVisible();
  });

  it('moves to the email field and says there that the email is already in use', async () => {
    await renderApp('/sign-up', {
      session: new FakeAuthSession({
        accounts: [{ email: 'grace@example.com', password: 'other-horse' }],
      }),
    });

    await signUp({ email: 'grace@example.com', password: 'correct-horse' });

    const emailInput = screen.getByLabelText('Email');
    await waitFor(() => expect(emailInput).toBeInvalid());
    expect(emailInput).toHaveAccessibleDescription(
      'An account with this email already exists. Sign in instead.',
    );
    expect(emailInput).toHaveFocus();
  });

  it('moves to the password field and says there that the password is too weak', async () => {
    await renderApp('/sign-up');

    await signUp({ email: 'grace@example.com', password: '123' });

    const passwordInput = screen.getByLabelText('Password');
    await waitFor(() => expect(passwordInput).toBeInvalid());
    expect(passwordInput).toHaveAccessibleDescription(
      'Choose a password with at least 6 characters.',
    );
    expect(passwordInput).toHaveFocus();
  });
});
