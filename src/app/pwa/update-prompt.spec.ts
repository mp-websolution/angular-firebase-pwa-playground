import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../testing/render-app';
import { FakeSwUpdate } from './testing/fake-sw-update';

describe('Update prompt', () => {
  afterEach(() => {
    // Drop the own property `returnToTab` sets, so `document` reports jsdom's state again.
    Reflect.deleteProperty(document, 'visibilityState');
  });

  it('stays hidden while the app is up to date', async () => {
    await renderApp('/sign-in');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('offers a reload when the app opens and a new version is ready', async () => {
    const swUpdate = new FakeSwUpdate();
    swUpdate.deployNewVersion();

    await renderApp('/sign-in', undefined, { swUpdate });

    expect(await screen.findByText('A new version is available.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
  });

  it('offers a reload when the user returns to the tab after a new version was deployed', async () => {
    const swUpdate = new FakeSwUpdate();
    await renderApp('/sign-in', undefined, { swUpdate });
    swUpdate.deployNewVersion();

    returnToTab();

    expect(await screen.findByText('A new version is available.')).toBeVisible();
  });

  it('waits until the new version is downloaded', async () => {
    const swUpdate = new FakeSwUpdate({ slowDownload: true });
    swUpdate.deployNewVersion();
    await renderApp('/sign-in', undefined, { swUpdate });
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();

    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();

    swUpdate.finishDownload();

    expect(await screen.findByText('A new version is available.')).toBeVisible();
  });

  it('reloads only when the user chooses to', async () => {
    const swUpdate = new FakeSwUpdate();
    swUpdate.deployNewVersion();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });
    const reload = await screen.findByRole('button', { name: 'Reload' });

    expect(reloadPage).not.toHaveBeenCalled();

    await userEvent.setup().click(reload);

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('goes away without reloading when the user picks later', async () => {
    const swUpdate = new FakeSwUpdate();
    swUpdate.deployNewVersion();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Later' }));

    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('comes back for the next version after the user picked later', async () => {
    const swUpdate = new FakeSwUpdate();
    swUpdate.deployNewVersion();
    await renderApp('/sign-in', undefined, { swUpdate });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Later' }));
    swUpdate.deployNewVersion();

    returnToTab();

    expect(await screen.findByText('A new version is available.')).toBeVisible();
  });

  it('asks for a reload when the current version breaks', async () => {
    const swUpdate = new FakeSwUpdate();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });

    swUpdate.breakCurrentVersion();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This version of the app stopped working. Reload to get the latest one.',
    );
    expect(screen.queryByRole('button', { name: 'Later' })).not.toBeInTheDocument();
  });

  it('reloads from the broken-version notice when the user chooses to', async () => {
    const swUpdate = new FakeSwUpdate();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });
    swUpdate.breakCurrentVersion();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Reload' }));

    expect(reloadPage).toHaveBeenCalledOnce();
  });
});

/** The user switches back to this tab, or brings the installed app to the front. */
function returnToTab(): void {
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}
