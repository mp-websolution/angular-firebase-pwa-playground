import { Component, inject } from '@angular/core';
import { Route } from '@angular/router';
import { AuthSession } from '../auth/auth-session';

@Component({
  template: `<h1>Start page</h1>
    <p>{{ session.user() ? 'Signed in as ' + session.user()?.email : 'Signed out' }}</p>`,
})
class StandInStartPage {
  protected readonly session = inject(AuthSession);
}

/** Stands in for the Feature at `/`, so a Baseline test that lands there depends on no Feature. */
export const standInStartPage: Route = {
  title: 'Start page',
  loadChildren: async () => [{ path: '', component: StandInStartPage }],
};
