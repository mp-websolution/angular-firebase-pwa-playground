import { render, screen } from '@testing-library/angular';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  it('shows the placeholder page at the root route', async () => {
    const { navigate } = await render(App, { routes });

    await navigate('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Angular Firebase PWA Playground' }),
    ).toBeVisible();
  });
});
