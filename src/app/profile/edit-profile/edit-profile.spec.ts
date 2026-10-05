import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FakeAuthSession } from '../../auth/testing/fake-auth-session';
import { renderApp } from '../../testing/render-app';
import { FakeProfileData } from '../testing/fake-profile-data';

const signedInAsAda = () => new FakeAuthSession({ signedInAs: 'ada@example.com' });

async function changeDisplayName(displayName: string) {
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText('Display name'));
  if (displayName) {
    await user.type(screen.getByLabelText('Display name'), displayName);
  }
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

describe('EditProfile', () => {
  it('shows the display name', async () => {
    await renderApp('/profile', signedInAsAda(), {
      profile: new FakeProfileData({ displayName: 'Ada Lovelace' }),
    });

    expect(await screen.findByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it('opens from home', async () => {
    await renderApp('/', signedInAsAda(), {
      profile: new FakeProfileData({ displayName: 'Ada Lovelace' }),
    });

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Profile' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it('sends signed-out visitors to sign-in', async () => {
    await renderApp('/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('saves a new display name', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', signedInAsAda(), { profile });

    await changeDisplayName('Ada Lovelace');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(profile.profile()).toEqual({ displayName: 'Ada Lovelace' });
  });

  it('saves the display name without surrounding spaces', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', signedInAsAda(), { profile });

    await changeDisplayName('  Ada Lovelace  ');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it("says a change made offline is saved on this device until it's synced", async () => {
    await renderApp('/profile', signedInAsAda(), {
      profile: new FakeProfileData({ displayName: 'Ada', offline: true }),
    });

    await changeDisplayName('Ada Lovelace');

    expect(await screen.findByRole('status')).toHaveTextContent(
      "Saved on this device. It syncs to your account once you're online.",
    );
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it('asks for a display name instead of saving a blank one', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', signedInAsAda(), { profile });

    await changeDisplayName('   ');

    expect(await screen.findByText('Enter a display name.')).toBeVisible();
    expect(screen.getByLabelText('Display name')).toBeInvalid();
    expect(profile.profile()).toEqual({ displayName: 'Ada' });
  });

  it('takes at most 50 characters for the display name', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', signedInAsAda(), { profile });

    await changeDisplayName('x'.repeat(51));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(profile.profile()).toEqual({ displayName: 'x'.repeat(50) });
  });

  it("says so when the profile can't be loaded", async () => {
    await renderApp('/profile', signedInAsAda(), {
      profile: new FakeProfileData({ loadFails: true }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your profile couldn't be loaded. Reload the page to try again.",
    );
  });
});
