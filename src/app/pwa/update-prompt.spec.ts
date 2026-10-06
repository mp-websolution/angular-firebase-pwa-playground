import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../testing/render-app';
import { FakeSwUpdate } from './testing/fake-sw-update';

describe('Update prompt', () => {
  it('stays hidden while the app is up to date', async () => {
    await renderApp('/sign-in');

    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('offers a reload when a new version is ready', async () => {
    const swUpdate = new FakeSwUpdate();
    await renderApp('/sign-in', undefined, { swUpdate });

    swUpdate.deployNewVersion();

    expect(await screen.findByText('A new version is available.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible();
  });

  it('reloads only when the user chooses to', async () => {
    const swUpdate = new FakeSwUpdate();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });
    swUpdate.deployNewVersion();
    const reload = await screen.findByRole('button', { name: 'Reload' });

    expect(reloadPage).not.toHaveBeenCalled();

    await userEvent.setup().click(reload);

    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('goes away without reloading when the user picks later', async () => {
    const swUpdate = new FakeSwUpdate();
    const reloadPage = vi.fn<() => void>();
    await renderApp('/sign-in', undefined, { swUpdate, reloadPage });
    swUpdate.deployNewVersion();

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Later' }));

    expect(screen.queryByText('A new version is available.')).not.toBeInTheDocument();
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('comes back for the next version after the user picked later', async () => {
    const swUpdate = new FakeSwUpdate();
    await renderApp('/sign-in', undefined, { swUpdate });
    swUpdate.deployNewVersion();
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Later' }));

    swUpdate.deployNewVersion();

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
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });
});
