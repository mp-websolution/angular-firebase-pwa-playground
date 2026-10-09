import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../auth-session';
import { messageOf } from '../auth-session-error';
import { CredentialsForm } from '../credentials-form';
import { Credentials } from '../credentials.model';
import { injectReturnUrl } from '../return-url';

@Component({
  selector: 'app-sign-in',
  imports: [CredentialsForm, RouterLink],
  templateUrl: './sign-in.html',
})
export class SignIn {
  readonly #session = inject(AuthSession);
  readonly #router = inject(Router);
  readonly #returnUrl = injectReturnUrl();

  protected readonly googlePending = signal(false);
  protected readonly googleError = signal('');

  protected readonly signIn = async (credentials: Credentials) => {
    await this.#session.signInWithEmail(credentials);
    await this.#router.navigateByUrl(this.#returnUrl);
  };

  protected async signInWithGoogle(): Promise<void> {
    this.googleError.set('');
    this.googlePending.set(true);
    try {
      await this.#session.signInWithGoogle();
    } catch (error) {
      this.googleError.set(messageOf(error));
      return;
    } finally {
      this.googlePending.set(false);
    }
    await this.#router.navigateByUrl(this.#returnUrl);
  }
}
