import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { injectReturnUrl } from '../auth-guards';
import { AuthSession } from '../auth-session';
import { Credentials, CredentialsForm } from '../credentials-form';

@Component({
  selector: 'app-sign-up',
  imports: [CredentialsForm, RouterLink],
  template: `
    <main class="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 class="text-3xl font-bold tracking-tight">Create account</h1>
      <app-credentials-form
        submitLabel="Create account"
        passwordAutocomplete="new-password"
        [action]="signUp"
      />
      <p class="text-slate-600">
        Already have an account?
        <a routerLink="/sign-in" queryParamsHandling="preserve" class="underline">Sign in</a>
      </p>
    </main>
  `,
})
export class SignUp {
  readonly #session = inject(AuthSession);
  readonly #router = inject(Router);
  readonly #returnUrl = injectReturnUrl();

  protected readonly signUp = async ({ email, password }: Credentials) => {
    await this.#session.signUpWithEmail(email, password);
    await this.#router.navigateByUrl(this.#returnUrl);
  };
}
