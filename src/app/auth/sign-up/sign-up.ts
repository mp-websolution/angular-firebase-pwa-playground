import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthSession } from '../auth-session';
import { CredentialsForm } from '../credentials-form';
import { Credentials } from '../credentials.model';
import { injectReturnUrl } from '../return-url';

@Component({
  selector: 'app-sign-up',
  imports: [CredentialsForm, RouterLink],
  templateUrl: './sign-up.html',
})
export class SignUp {
  readonly #session = inject(AuthSession);
  readonly #router = inject(Router);
  readonly #returnUrl = injectReturnUrl();

  protected readonly signUp = async (credentials: Credentials) => {
    await this.#session.signUpWithEmail(credentials);
    await this.#router.navigateByUrl(this.#returnUrl);
  };
}
