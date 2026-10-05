import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../testing/render-app';
import { Credentials } from '../credentials.model';
import { FakeAuthSession } from '../testing/fake-auth-session';

const ada: Credentials = { email: 'ada@example.com', password: 'correct-horse' };

async function signIn({ email, password }: Credentials) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignIn', () => {
  it('signs in with email and password and opens home', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ accounts: [ada] }));

    await signIn(ada);

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('says so when the password is wrong', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ accounts: [ada] }));

    await signIn({ ...ada, password: 'wrong-horse' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('says the same when no account uses the email, so it does not reveal who has one', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ accounts: [ada] }));

    await signIn({ ...ada, email: 'grace@example.com' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('asks for an email and a password before trying to sign in', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ accounts: [ada] }));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email.')).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeInvalid();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('asks for a valid email address', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ accounts: [ada] }));

    await signIn({ ...ada, email: 'ada-at-example.com' });

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
  });

  it('signs in with Google and opens home', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ googlePopup: { email: 'ada@gmail.com' } }));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByText('Signed in as ada@gmail.com')).toBeVisible();
  });

  it('says so when the Google window is closed before finishing', async () => {
    await renderApp('/sign-in', new FakeAuthSession({ googlePopup: 'closed' }));

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Google sign-in window was closed before you finished.',
    );
  });
});
