import { ComponentFixture } from '@angular/core/testing';
import { screen, waitForElementToBeRemoved } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { FakeAuthSession } from '../../auth/testing/fake-auth-session';
import { renderApp } from '../../testing/render-app';
import { FakeProfileData } from '../testing/fake-profile-data';

async function changeDisplayName(displayName: string) {
  const user = userEvent.setup();
  await user.clear(await screen.findByLabelText('Display name'));
  await user.type(screen.getByLabelText('Display name'), displayName);
  await user.click(screen.getByRole('button', { name: 'Save' }));
}

function pickedFile(name: string, type: string, size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

function aUserWhoSwitchesTheFileDialogToAllFiles() {
  return userEvent.setup({ applyAccept: false });
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

  it('opens from home', async () => {
    await renderApp('/', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
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

  it('shows the avatar', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({
        displayName: 'Ada',
        avatarUrl: 'https://storage.example/avatars/ada.png',
      }),
    });

    expect(await screen.findByRole('img', { name: 'Your avatar' })).toHaveAttribute(
      'src',
      'https://storage.example/avatars/ada.png',
    );
  });

  it('asks for a display name before an avatar can be uploaded', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData(),
    });

    expect(await screen.findByText('Save a display name first.')).toBeVisible();
    expect(screen.getByLabelText('Avatar')).toBeDisabled();
  });

  it('offers the avatar upload once a display name is saved', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData(),
    });

    await changeDisplayName('Ada');

    expect(await screen.findByRole('status')).toHaveTextContent('Saved.');
    expect(screen.getByLabelText('Avatar')).toBeEnabled();
    expect(screen.queryByText('Save a display name first.')).not.toBeInTheDocument();
  });

  it('uploads an avatar and shows it', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await userEvent
      .setup()
      .upload(await screen.findByLabelText('Avatar'), pickedFile('ada.png', 'image/png'));

    expect(await screen.findByRole('img', { name: 'Your avatar' })).toHaveAttribute(
      'src',
      'https://storage.example/avatars/ada.png',
    );
  });

  it('accepts an image of exactly 2 MB', async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await userEvent
      .setup()
      .upload(
        await screen.findByLabelText('Avatar'),
        pickedFile('ada.png', 'image/png', 2 * 1024 * 1024),
      );

    expect(await screen.findByRole('img', { name: 'Your avatar' })).toHaveAttribute(
      'src',
      'https://storage.example/avatars/ada.png',
    );
  });

  it('says an image larger than 2 MB is too large, instead of uploading it', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await userEvent
      .setup()
      .upload(
        await screen.findByLabelText('Avatar'),
        pickedFile('ada.png', 'image/png', 2 * 1024 * 1024 + 1),
      );

    expect(await screen.findByText('Choose an image of at most 2 MB.')).toBeVisible();
    expect(screen.getByLabelText('Avatar')).toBeInvalid();
    expect(profile.profile()?.avatarUrl).toBeUndefined();
  });

  it.each([
    ['ada.jpg', 'image/jpeg'],
    ['ada.webp', 'image/webp'],
    ['ada.gif', 'image/gif'],
  ])('accepts %s as an avatar', async (name, type) => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada' }),
    });

    await userEvent.setup().upload(await screen.findByLabelText('Avatar'), pickedFile(name, type));

    expect(await screen.findByRole('img', { name: 'Your avatar' })).toHaveAttribute(
      'src',
      `https://storage.example/avatars/${name}`,
    );
  });

  it.each([
    ['notes.txt', 'text/plain'],
    ['logo.svg', 'image/svg+xml'],
  ])('asks for a PNG, JPEG, WebP or GIF instead of uploading %s', async (name, type) => {
    const profile = new FakeProfileData({ displayName: 'Ada' });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });
    const user = aUserWhoSwitchesTheFileDialogToAllFiles();

    await user.upload(await screen.findByLabelText('Avatar'), pickedFile(name, type));

    expect(await screen.findByText('Choose a PNG, JPEG, WebP or GIF image.')).toBeVisible();
    expect(screen.getByLabelText('Avatar')).toBeInvalid();
    expect(profile.profile()?.avatarUrl).toBeUndefined();
  });

  it('shows that the avatar is uploading until it is done', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada', slowUpload: true });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });

    await userEvent
      .setup()
      .upload(await screen.findByLabelText('Avatar'), pickedFile('ada.png', 'image/png'));

    expect(await screen.findByText('Uploading…')).toBeVisible();
    expect(screen.getByLabelText('Avatar')).toBeDisabled();

    profile.finishUpload();

    await waitForElementToBeRemoved(() => screen.queryByText('Uploading…'));
    expect(screen.getByRole('img', { name: 'Your avatar' })).toBeVisible();
    expect(screen.getByLabelText('Avatar')).toBeEnabled();
  });

  it("says so when the avatar can't be uploaded", async () => {
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile: new FakeProfileData({ displayName: 'Ada', uploadFails: true }),
    });

    await userEvent
      .setup()
      .upload(await screen.findByLabelText('Avatar'), pickedFile('ada.png', 'image/png'));

    expect(
      await screen.findByText(
        "Your avatar couldn't be uploaded. Check your connection and try again.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole('img', { name: 'Your avatar' })).not.toBeInTheDocument();
  });

  it('uploads the same image again when picked again, e.g. to retry', async () => {
    const profile = new FakeProfileData({ displayName: 'Ada', slowUpload: true });
    await renderApp('/profile', {
      session: new FakeAuthSession({ signedInAs: 'ada@example.com' }),
      profile,
    });
    const user = userEvent.setup();
    const image = pickedFile('ada.png', 'image/png');
    await user.upload(await screen.findByLabelText('Avatar'), image);
    const uploading = await screen.findByText('Uploading…');
    profile.finishUpload();
    await waitForElementToBeRemoved(uploading);

    await user.upload(screen.getByLabelText('Avatar'), image);

    expect(await screen.findByText('Uploading…')).toBeVisible();
  });
});
