import { ComponentFixture } from '@angular/core/testing';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FakeAuthSession } from '../../../testing/fake-auth-session';
import { renderApp } from '../../../testing/render-app';
import { FakeProfileData } from '../../../testing/fake-profile-data';
import { standInStartPage } from '../../../testing/stand-in-start-page';

async function changeDisplayName(displayName: string) {
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText('Display name'));
  await user.type(screen.getByLabelText('Display name'), displayName);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

function waitForRenderingSinceNothingChangesToFind(fixture: ComponentFixture<unknown>) {
  return fixture.whenStable();
}

describe('EditProfile', () => {
  it('shows the display name', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada Lovelace' }),
    });

    expect(await screen.findByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it('goes back to the start page', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      startPage: standInStartPage,
    });

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Back' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Start page' })).toBeVisible();
  });

  it('signs out and opens the start page', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      startPage: standInStartPage,
    });

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Start page' })).toBeVisible();
    expect(screen.getByText('Signed out')).toBeVisible();
  });

  it('keeps the user signed in and asks to close other tabs when they block sign-out', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com', otherTabsOpen: true }),
    });

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Close the app in your other tabs, then sign out again.',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
  });

  it('sends signed-out visitors to sign-in', async () => {
    await renderApp('/profile');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  });

  it('saves a new display name', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName('Ada Lovelace');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(profile.profile()).toEqual({ displayName: 'Ada Lovelace' });
  });

  it('saves the display name without surrounding spaces', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName('  Ada Lovelace  ');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
    expect(profile.profile()).toEqual({ displayName: 'Ada Lovelace' });
  });

  it('says it saved when only spaces were added around the stored name', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await changeDisplayName('Ada ');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(screen.getByLabelText('Display name')).toHaveValue('Ada');
  });

  it("says a change made offline is saved on this device until it's synced", async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
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
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName('   ');

    expect(await screen.findByText('Enter a display name.')).toBeVisible();
    expect(screen.getByLabelText('Display name')).toBeInvalid();
    expect(profile.profile()).toEqual({ displayName: 'Ada' });
  });

  it('asks for a display name of at least 2 characters', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName(' A ');

    expect(await screen.findByText('Use at least 2 characters.')).toBeVisible();
    expect(screen.getByLabelText('Display name')).toBeInvalid();
    expect(profile.profile()).toEqual({ displayName: 'Ada' });
  });

  it('asks for a display name of at most 50 characters', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName('x'.repeat(51));

    expect(await screen.findByText('Use at most 50 characters.')).toBeVisible();
    expect(screen.getByLabelText('Display name')).toBeInvalid();
    expect(profile.profile()).toEqual({ displayName: 'Ada' });
  });

  it('leaves spaces around the display name out of the 50 characters', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await changeDisplayName(` ${'x'.repeat(50)} `);

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(profile.profile()).toEqual({ displayName: 'x'.repeat(50) });
  });

  it('shows a display name changed elsewhere, e.g. in another tab', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });
    await screen.findByLabelText('Display name');

    profile.changeElsewhere('Countess of Lovelace');

    expect(await screen.findByDisplayValue('Countess of Lovelace')).toBeVisible();
  });

  it('keeps what the user is typing when the display name changes elsewhere', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    const { fixture } = await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });
    await userEvent.setup().type(await screen.findByLabelText('Display name'), ' Lovelace');

    profile.changeElsewhere('Countess of Lovelace');
    await waitForRenderingSinceNothingChangesToFind(fixture);

    expect(screen.getByLabelText('Display name')).toHaveValue('Ada Lovelace');
  });

  it('follows changes made elsewhere again once the typed name is saved', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });
    await changeDisplayName('  Ada Lovelace  ');
    await screen.findByText('Saved.');

    profile.changeElsewhere('Countess of Lovelace');

    expect(await screen.findByDisplayValue('Countess of Lovelace')).toBeVisible();
  });

  it('stops saying it saved once the user edits the name again', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });
    await changeDisplayName('Ada Lovelace');
    await screen.findByText('Saved.');

    await userEvent.setup().type(screen.getByLabelText('Display name'), '!');

    expect(screen.getByRole('status')).not.toHaveTextContent('Saved.');
  });

  it("says so when the profile can't be loaded", async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ loadFails: true }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "Your profile couldn't be loaded. Reload the page to try again.",
    );
  });

  it('shows the photo of the Google account the user signed in with', async () => {
    const photoUrl = 'https://lh3.googleusercontent.com/a/ada-photo';
    await renderApp('/profile', {
      session: new FakeAuthSession({ googlePopup: { email: 'ada@gmail.com', photoUrl } }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Sign in with Google' }));

    const photo = await screen.findByRole('img', { name: 'Your photo' });
    expect(photo).toHaveAttribute('src', photoUrl);
    expect(photo).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('shows no image to a Google user whose account has no photo', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ googlePopup: { email: 'ada@gmail.com' } }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Sign in with Google' }));

    expect(await screen.findByLabelText('Display name')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows no image to an email and password user', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    expect(await screen.findByLabelText('Display name')).toBeVisible();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('offers no avatar upload', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData(),
    });

    expect(await screen.findByLabelText('Display name')).toBeVisible();
    expect(screen.queryByLabelText(/avatar|photo/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Save a display name first.')).not.toBeInTheDocument();
  });
});
