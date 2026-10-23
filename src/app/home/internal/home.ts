import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../../auth/auth-session';
import { messageOf } from '../../auth/auth-session-error';
import { appIdentity } from '../../../app-identity/app-identity';
import { FEATURE_LINKS } from './feature-links';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
})
export class Home {
  protected readonly session = inject(AuthSession);
  protected readonly appIdentity = appIdentity;
  protected readonly featureLinks = inject(FEATURE_LINKS);
  readonly #router = inject(Router);

  protected readonly signingOut = signal(false);
  protected readonly error = signal('');

  protected async signOut(): Promise<void> {
    this.error.set('');
    this.signingOut.set(true);
    try {
      await this.session.signOut();
    } catch (error) {
      this.error.set(messageOf(error));
      return;
    } finally {
      this.signingOut.set(false);
    }
    await this.#router.navigateByUrl('/sign-in');
  }
}
