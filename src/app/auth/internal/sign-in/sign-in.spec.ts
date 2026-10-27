import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../../../testing/render-app';
import { Credentials } from '../../credentials.model';
import { FakeAuthSession } from '../../../testing/fake-auth-session';
import { SignInMethods } from '../../../../app-identity/sign-in-methods';
import { SIGN_IN_METHODS } from '../sign-in-methods';

const ada: Credentials = { email: 'ada@example.com', password: 'correct-horse' };

function offering(methods: SignInMethods) {
  return { providers: [{ provide: SIGN_IN_METHODS, useValue: methods }] };
}

function signInButtonNames(): string[] {
  return screen
    .getAllByRole('button', { name: /^Sign in/ })
    .map((button) => button.textContent.trim());
}

async function signIn({ email, password }: Credentials) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('SignIn', () => {
  it('signs in with email and password and opens home', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ accounts: [ada] }) });

    await signIn(ada);

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('stays in the app when the return URL points to another site', async () => {
    await renderApp('/sign-in?returnUrl=https%3A%2F%2Fevil.example.com', {
      session: new FakeAuthSession({ accounts: [ada] }),
    });

    await signIn(ada);

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('says so when the password is wrong', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ accounts: [ada] }) });

    await signIn({ ...ada, password: 'wrong-horse' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('signs in when the same details are sent again after a failure', async () => {
    const session = new FakeAuthSession({ accounts: [ada], offline: true });
    await renderApp('/sign-in', { session });
    await signIn(ada);
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach the server.");

    session.reconnect();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Signed in as ada@example.com')).toBeVisible();
  });

  it('says the same when no account uses the email, so it does not reveal who has one', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ accounts: [ada] }) });

    await signIn({ ...ada, email: 'grace@example.com' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.');
  });

  it('asks for an email and a password before trying to sign in', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ accounts: [ada] }) });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email.')).toBeVisible();
    expect(screen.getByText('Enter your password.')).toBeVisible();
    expect(screen.getByLabelText('Email')).toBeInvalid();
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('asks for a valid email address', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ accounts: [ada] }) });

    await signIn({ ...ada, email: 'ada-at-example.com' });

    expect(await screen.findByText('Enter a valid email address.')).toBeVisible();
  });

  it('signs in with Google and opens home', async () => {
    await renderApp('/sign-in', {
      session: new FakeAuthSession({ googlePopup: { email: 'ada@gmail.com' } }),
    });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByText('Signed in as ada@gmail.com')).toBeVisible();
  });

  it('says so when the Google window is closed before finishing', async () => {
    await renderApp('/sign-in', { session: new FakeAuthSession({ googlePopup: 'closed' }) });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Google sign-in window was closed before you finished.',
    );
  });

  it('offers email and password first, then Google, and a link to create an account', async () => {
    await renderApp('/sign-in', offering(['password', 'google']));

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(screen.getByLabelText('Password')).toBeVisible();
    expect(signInButtonNames()).toEqual(['Sign in', 'Sign in with Google']);
    expect(screen.getByRole('link', { name: 'Create one' })).toBeVisible();
  });

  it('offers Google first when the list puts it first', async () => {
    await renderApp('/sign-in', offering(['google', 'password']));

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(signInButtonNames()).toEqual(['Sign in with Google', 'Sign in']);
  });

  it('offers only Google, with no password fields and no way to create an account', async () => {
    await renderApp('/sign-in', offering(['google']));

    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    expect(signInButtonNames()).toEqual(['Sign in with Google']);
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Create one' })).not.toBeInTheDocument();
  });

  it('offers only email and password, with no Google button', async () => {
    await renderApp('/sign-in', offering(['password']));

    expect(await screen.findByLabelText('Email')).toBeVisible();
    expect(signInButtonNames()).toEqual(['Sign in']);
    expect(screen.getByRole('link', { name: 'Create one' })).toBeVisible();
  });
});
